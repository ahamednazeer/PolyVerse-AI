'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useWalkthrough } from './WalkthroughContext';
import {
    ArrowRight,
    ArrowLeft,
    X,
    Sparkle,
    CheckCircle
} from '@phosphor-icons/react';

interface TooltipPosition {
    top: number;
    left: number;
    arrowPosition: 'top' | 'bottom' | 'left' | 'right';
}

export default function WalkthroughOverlay() {
    const {
        isActive,
        currentStep,
        totalSteps,
        currentStepData,
        nextStep,
        prevStep,
        skipWalkthrough,
    } = useWalkthrough();

    const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
    const [tooltipPosition, setTooltipPosition] = useState<TooltipPosition | null>(null);
    const [isAnimating, setIsAnimating] = useState(false);

    // Find and highlight target element
    const updateTargetPosition = useCallback(() => {
        if (!currentStepData) return;

        const target = document.querySelector(currentStepData.targetSelector);
        if (target) {
            const rect = target.getBoundingClientRect();
            setTargetRect(rect);

            // Calculate tooltip position based on step configuration
            const padding = 20;
            const tooltipWidth = 320;
            const tooltipHeight = 220; // Increased for better spacing

            let top = 0;
            let left = 0;
            let arrowPosition: 'top' | 'bottom' | 'left' | 'right' = 'top';
            let preferredPosition = currentStepData.position;

            // Check if preferred position has enough space, if not flip it
            const spaceAbove = rect.top;
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceLeft = rect.left;
            const spaceRight = window.innerWidth - rect.right;

            // Auto-flip vertical positions if not enough space
            if (preferredPosition === 'top' && spaceAbove < tooltipHeight + padding) {
                preferredPosition = 'bottom';
            } else if (preferredPosition === 'bottom' && spaceBelow < tooltipHeight + padding) {
                preferredPosition = 'top';
            }

            // Auto-flip horizontal positions if not enough space
            if (preferredPosition === 'left' && spaceLeft < tooltipWidth + padding) {
                preferredPosition = 'right';
            } else if (preferredPosition === 'right' && spaceRight < tooltipWidth + padding) {
                preferredPosition = 'left';
            }

            switch (preferredPosition) {
                case 'top':
                    top = rect.top - tooltipHeight - padding;
                    left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
                    arrowPosition = 'bottom';
                    break;
                case 'bottom':
                    top = rect.bottom + padding;
                    left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
                    arrowPosition = 'top';
                    break;
                case 'left':
                    top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
                    left = rect.left - tooltipWidth - padding;
                    arrowPosition = 'right';
                    break;
                case 'right':
                    top = rect.top + (rect.height / 2) - (tooltipHeight / 2);
                    left = rect.right + padding;
                    arrowPosition = 'left';
                    break;
            }

            // Final viewport clamping
            left = Math.max(16, Math.min(left, window.innerWidth - tooltipWidth - 16));
            top = Math.max(16, Math.min(top, window.innerHeight - tooltipHeight - 16));

            setTooltipPosition({ top, left, arrowPosition });
        }
    }, [currentStepData]);

    useEffect(() => {
        if (isActive && currentStepData) {
            setIsAnimating(true);
            const timer = setTimeout(() => {
                updateTargetPosition();
                setIsAnimating(false);
            }, 100);

            // Recalculate on resize
            window.addEventListener('resize', updateTargetPosition);
            window.addEventListener('scroll', updateTargetPosition, true);

            return () => {
                clearTimeout(timer);
                window.removeEventListener('resize', updateTargetPosition);
                window.removeEventListener('scroll', updateTargetPosition, true);
            };
        }
    }, [isActive, currentStepData, updateTargetPosition]);

    // Handle keyboard navigation
    useEffect(() => {
        if (!isActive) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') skipWalkthrough();
            if (e.key === 'ArrowRight' || e.key === 'Enter') nextStep();
            if (e.key === 'ArrowLeft') prevStep();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isActive, nextStep, prevStep, skipWalkthrough]);

    if (!isActive || !targetRect || !tooltipPosition) return null;

    const isLastStep = currentStep === totalSteps - 1;
    const isFirstStep = currentStep === 0;

    return (
        <div className="fixed inset-0 z-[9999] pointer-events-none">
            {/* Dark overlay with spotlight cutout */}
            <svg className="absolute inset-0 w-full h-full pointer-events-auto">
                <defs>
                    <mask id="spotlight-mask">
                        <rect x="0" y="0" width="100%" height="100%" fill="white" />
                        <rect
                            x={targetRect.left - 8}
                            y={targetRect.top - 8}
                            width={targetRect.width + 16}
                            height={targetRect.height + 16}
                            rx="12"
                            fill="black"
                            className="transition-all duration-300 ease-out"
                        />
                    </mask>
                </defs>
                <rect
                    x="0"
                    y="0"
                    width="100%"
                    height="100%"
                    fill="rgba(15, 23, 42, 0.85)"
                    mask="url(#spotlight-mask)"
                    onClick={skipWalkthrough}
                />
            </svg>

            {/* Glowing border around target */}
            <div
                className="absolute transition-all duration-300 ease-out rounded-xl pointer-events-none"
                style={{
                    top: targetRect.top - 8,
                    left: targetRect.left - 8,
                    width: targetRect.width + 16,
                    height: targetRect.height + 16,
                    boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.5), 0 0 20px rgba(59, 130, 246, 0.3), 0 0 40px rgba(59, 130, 246, 0.1)',
                }}
            />

            {/* Tooltip */}
            <div
                className={`absolute w-80 pointer-events-auto transition-all duration-300 ease-out ${isAnimating ? 'opacity-0 scale-95' : 'opacity-100 scale-100'}`}
                style={{
                    top: tooltipPosition.top,
                    left: tooltipPosition.left,
                }}
            >
                <div className="relative bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-xl shadow-2xl overflow-hidden">
                    {/* Gradient accent line */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-400 to-cyan-400" />

                    {/* Content */}
                    <div className="p-5">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                    <Sparkle size={16} weight="duotone" className="text-blue-400" />
                                </div>
                                <h3 className="font-bold text-slate-100 text-base">{currentStepData?.title}</h3>
                            </div>
                            <button
                                onClick={skipWalkthrough}
                                className="p-1 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
                                title="Skip tour"
                            >
                                <X size={16} />
                            </button>
                        </div>

                        {/* Description */}
                        <p className="text-slate-400 text-sm leading-relaxed mb-4">
                            {currentStepData?.description}
                        </p>

                        {/* Progress and Navigation */}
                        <div className="flex items-center justify-between">
                            {/* Step indicator */}
                            <div className="flex items-center gap-1.5">
                                {Array.from({ length: totalSteps }).map((_, i) => (
                                    <div
                                        key={i}
                                        className={`h-1.5 rounded-full transition-all duration-300 ${i === currentStep
                                            ? 'w-6 bg-blue-500'
                                            : i < currentStep
                                                ? 'w-1.5 bg-blue-400/50'
                                                : 'w-1.5 bg-slate-600'
                                            }`}
                                    />
                                ))}
                            </div>

                            {/* Navigation buttons */}
                            <div className="flex items-center gap-2">
                                {!isFirstStep && (
                                    <button
                                        onClick={prevStep}
                                        className="flex items-center gap-1 px-3 py-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-all text-sm font-medium"
                                    >
                                        <ArrowLeft size={14} />
                                        Back
                                    </button>
                                )}
                                <button
                                    onClick={nextStep}
                                    className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg transition-all text-sm font-medium shadow-lg shadow-blue-500/20"
                                >
                                    {isLastStep ? (
                                        <>
                                            <CheckCircle size={14} weight="bold" />
                                            Finish
                                        </>
                                    ) : (
                                        <>
                                            Next
                                            <ArrowRight size={14} />
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Step counter */}
                        <p className="text-xs text-slate-500 font-mono mt-3 text-center">
                            Step {currentStep + 1} of {totalSteps}
                        </p>
                    </div>

                    {/* Arrow indicator */}
                    <div
                        className={`absolute w-3 h-3 bg-slate-900/95 border-slate-700/80 transform rotate-45 ${tooltipPosition.arrowPosition === 'top'
                            ? '-top-1.5 left-1/2 -translate-x-1/2 border-l border-t'
                            : tooltipPosition.arrowPosition === 'bottom'
                                ? '-bottom-1.5 left-1/2 -translate-x-1/2 border-r border-b'
                                : tooltipPosition.arrowPosition === 'left'
                                    ? '-left-1.5 top-1/2 -translate-y-1/2 border-l border-b'
                                    : '-right-1.5 top-1/2 -translate-y-1/2 border-r border-t'
                            }`}
                    />
                </div>
            </div>
        </div>
    );
}
