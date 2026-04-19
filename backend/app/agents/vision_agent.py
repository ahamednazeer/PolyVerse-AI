"""Vision Agent — Multi-modal pipeline with OCR, image understanding, and speech-to-text."""
import asyncio
import os
import base64
import logging
from typing import AsyncGenerator

from app.agents.base_agent import BaseAgent, AgentInput, AgentOutput
from app.llm.groq_client import groq_client
from app.llm.prompt_manager import get_system_prompt, build_messages
from app.services.model_downloads import ensure_whisper_model_file

logger = logging.getLogger("polyverse.agents.vision")


class VisionAgent(BaseAgent):
    name = "vision"
    description = "Multi-modal analysis with OCR, image understanding, and voice transcription"
    version = "2.0.0"
    max_retries = 2
    timeout_seconds = 90.0

    def __init__(self):
        super().__init__()
        self._ocr_reader = None
        self._whisper_model = None

    def _get_ocr_reader(self):
        """Lazy-load EasyOCR reader."""
        if self._ocr_reader is None:
            try:
                import easyocr
                self._ocr_reader = easyocr.Reader(["en", "hi", "ta"], gpu=False)
                logger.info("EasyOCR reader initialized")
            except ImportError:
                logger.warning("EasyOCR not installed — OCR unavailable")
            except Exception as e:
                logger.error(f"EasyOCR init error: {e}")
        return self._ocr_reader

    def get_warmup_statuses(self, agent_input: AgentInput) -> list[str]:
        statuses = []
        has_image = any((file_info.get("type", "") or "").startswith("image/") for file_info in agent_input.files)
        has_audio = any((file_info.get("type", "") or "").startswith("audio/") for file_info in agent_input.files)

        if has_image and self._ocr_reader is None:
            statuses.append("Preparing vision OCR model. First use may download model files.")
        if has_audio and self._whisper_model is None:
            statuses.append("Preparing voice transcription model. First use may download model files.")

        return statuses

    def _get_whisper_model(self):
        """Lazy-load Whisper model."""
        if self._whisper_model is None:
            try:
                import whisper
                from app.config import settings
                model_path = ensure_whisper_model_file(settings.WHISPER_MODEL)
                self._whisper_model = whisper.load_model(model_path)
                logger.info(f"Whisper model loaded: {settings.WHISPER_MODEL}")
            except ImportError:
                logger.warning("openai-whisper not installed — STT unavailable")
            except Exception as e:
                logger.error(f"Whisper init error: {e}")
        return self._whisper_model

    async def prepare_models(self, agent_input: AgentInput, progress_callback=None):
        has_audio = any((file_info.get("type", "") or "").startswith("audio/") for file_info in agent_input.files)
        if has_audio and self._whisper_model is None:
            import whisper
            from app.config import settings

            def _load_whisper():
                model_path = ensure_whisper_model_file(settings.WHISPER_MODEL, progress_callback)
                return whisper.load_model(model_path)

            self._whisper_model = await asyncio.to_thread(_load_whisper)

    async def _run_ocr(self, image_path: str) -> dict:
        """Extract text from image with confidence scores."""
        reader = self._get_ocr_reader()
        if not reader:
            return {"text": "", "confidence": 0.0, "error": "OCR not available"}

        try:
            import asyncio
            results = await asyncio.to_thread(reader.readtext, image_path)

            extracted = []
            confidences = []
            for bbox, text, conf in results:
                if conf > 0.2:  # Low threshold to capture more text
                    extracted.append(text)
                    confidences.append(conf)

            avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

            return {
                "text": " ".join(extracted),
                "line_count": len(extracted),
                "avg_confidence": round(avg_conf, 3),
                "raw_results": [
                    {"text": text, "confidence": round(conf, 3)}
                    for _, text, conf in results if conf > 0.2
                ],
            }
        except Exception as e:
            logger.error(f"OCR error on {image_path}: {e}")
            return {"text": "", "confidence": 0.0, "error": str(e)}

    async def _run_stt(self, audio_path: str) -> dict:
        """Transcribe audio file."""
        model = self._get_whisper_model()
        if not model:
            return {"text": "", "language": "unknown", "error": "Whisper not available"}

        try:
            import asyncio
            result = await asyncio.to_thread(model.transcribe, audio_path)
            return {
                "text": result.get("text", "").strip(),
                "language": result.get("language", "unknown"),
                "segments": len(result.get("segments", [])),
            }
        except Exception as e:
            logger.error(f"STT error on {audio_path}: {e}")
            return {"text": "", "language": "unknown", "error": str(e)}

    def _encode_image_base64(self, image_path: str) -> str | None:
        """Encode image to base64 data URL for vision model."""
        try:
            ext = os.path.splitext(image_path)[1].lower()
            mime_map = {".jpg": "jpeg", ".jpeg": "jpeg", ".png": "png", ".gif": "gif", ".webp": "webp"}
            mime_type = mime_map.get(ext, "jpeg")

            with open(image_path, "rb") as f:
                encoded = base64.b64encode(f.read()).decode("utf-8")
            return f"data:image/{mime_type};base64,{encoded}"
        except Exception as e:
            logger.error(f"Image encoding error: {e}")
            return None

    async def preprocess(self, agent_input: AgentInput) -> AgentInput:
        """Process all attached files (images, audio) before LLM call."""
        multimodal_context = []
        ocr_results = []
        stt_results = []

        for file_info in agent_input.files:
            file_type = file_info.get("type", "")
            file_path = file_info.get("path", "")

            if not file_path or not os.path.exists(file_path):
                continue

            if file_type.startswith("image/"):
                # Run OCR
                ocr = await self._run_ocr(file_path)
                ocr_results.append(ocr)
                if ocr.get("text"):
                    multimodal_context.append(
                        f"📷 **OCR from {file_info.get('name', 'image')}** "
                        f"(confidence: {ocr.get('avg_confidence', 0):.0%}):\n{ocr['text']}"
                    )

                # Encode for vision model
                data_url = self._encode_image_base64(file_path)
                if data_url:
                    file_info["data_url"] = data_url

            elif file_type.startswith("audio/"):
                stt = await self._run_stt(file_path)
                stt_results.append(stt)
                if stt.get("text"):
                    multimodal_context.append(
                        f"🎙️ **Transcription** (language: {stt.get('language', '?')}):\n{stt['text']}"
                    )

        agent_input.metadata["multimodal_context"] = "\n\n".join(multimodal_context)
        agent_input.metadata["ocr_results"] = ocr_results
        agent_input.metadata["stt_results"] = stt_results

        logger.info(
            f"Preprocessed: {len(ocr_results)} images (OCR), {len(stt_results)} audio (STT)"
        )
        return agent_input

    async def _build_enhanced_message(self, agent_input: AgentInput) -> str:
        """Combine OCR/STT context with direct image analysis for both sync and streaming paths."""
        multimodal = agent_input.metadata.get("multimodal_context", "")

        vision_analysis = ""
        for file_info in agent_input.files:
            data_url = file_info.get("data_url")
            if not data_url:
                continue

            try:
                analysis = await groq_client.vision_chat(
                    f"Analyze this image in detail. {agent_input.message}",
                    data_url,
                )
                vision_analysis += f"\n\n👁️ **Vision Analysis**:\n{analysis}"
            except Exception as e:
                logger.warning(f"Vision model error: {e}")

        full_context = ""
        if multimodal:
            full_context += f"Extracted content from uploaded files:\n\n{multimodal}"
        if vision_analysis:
            full_context += vision_analysis

        agent_input.metadata["vision_analysis"] = vision_analysis.strip()

        if full_context:
            return f"{agent_input.message}\n\n---\n{full_context}"

        return agent_input.message

    async def process(self, agent_input: AgentInput) -> AgentOutput:
        system_prompt = get_system_prompt("vision")
        enhanced_msg = await self._build_enhanced_message(agent_input)
        vision_analysis = agent_input.metadata.get("vision_analysis", "")

        messages = build_messages(system_prompt, enhanced_msg, agent_input.history)
        content = await groq_client.chat(messages)

        return AgentOutput(
            content=content,
            agent_name=self.name,
            confidence=0.85,
            metadata={
                "ocr_count": len(agent_input.metadata.get("ocr_results", [])),
                "stt_count": len(agent_input.metadata.get("stt_results", [])),
                "vision_used": bool(vision_analysis),
                "multimodal_context": bool(agent_input.metadata.get("multimodal_context")),
            },
        )

    async def stream(self, agent_input: AgentInput) -> AsyncGenerator[str, None]:
        system_prompt = get_system_prompt("vision")
        enhanced_msg = await self._build_enhanced_message(agent_input)

        messages = build_messages(system_prompt, enhanced_msg, agent_input.history)
        async for chunk in groq_client.stream_chat(messages):
            yield chunk
