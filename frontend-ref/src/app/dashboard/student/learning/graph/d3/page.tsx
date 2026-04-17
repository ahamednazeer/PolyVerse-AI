'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { api } from '@/lib/api';
import { ArrowLeft, ZoomIn, ZoomOut, Maximize2, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface TopicNode extends d3.SimulationNodeDatum {
    id: number;
    name: string;
    subject_code?: string;
    difficulty: number;
    status: string;
    progress_percent: number;
    confidence_score: number | null;
}

interface GraphEdge {
    source: number | TopicNode;
    target: number | TopicNode;
    strength: string;
}

interface GraphData {
    nodes: TopicNode[];
    edges: GraphEdge[];
}

export default function KnowledgeGraphD3Page() {
    const [graphData, setGraphData] = useState<GraphData | null>(null);
    const [selectedNode, setSelectedNode] = useState<TopicNode | null>(null);
    const [loading, setLoading] = useState(true);
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const simulationRef = useRef<d3.Simulation<TopicNode, GraphEdge> | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    useEffect(() => {
        if (graphData && svgRef.current && containerRef.current) {
            renderGraph();
        }
    }, [graphData]);

    const loadData = async () => {
        try {
            setLoading(true);
            const data = await api.getMyKnowledgeGraph();
            setGraphData({
                nodes: data.nodes || [],
                edges: (data.edges || []).map((e: any) => ({
                    source: e.from,
                    target: e.to,
                    strength: e.strength,
                })),
            });
        } catch (error) {
            console.error('Error loading graph data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string, progress: number) => {
        if (status === 'COMPLETED') return '#22C55E';
        if (status === 'IN_PROGRESS') return '#3B82F6';
        if (status === 'NEEDS_REVIEW') return '#F59E0B';
        if (progress > 0) return '#6366F1';
        return '#9CA3AF';
    };

    const getEdgeColor = (strength: string) => {
        switch (strength) {
            case 'REQUIRED': return '#EF4444';
            case 'RECOMMENDED': return '#F59E0B';
            case 'RELATED': return '#9CA3AF';
            default: return '#CBD5E1';
        }
    };

    const renderGraph = useCallback(() => {
        if (!graphData || !svgRef.current || !containerRef.current) return;

        const container = containerRef.current;
        const width = container.clientWidth;
        const height = container.clientHeight;

        // Clear existing content
        d3.select(svgRef.current).selectAll('*').remove();

        const svg = d3.select(svgRef.current)
            .attr('width', width)
            .attr('height', height);

        // Create zoom behavior
        const zoom = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.2, 4])
            .on('zoom', (event) => {
                g.attr('transform', event.transform);
            });

        svg.call(zoom);

        // Create main group for zoom/pan
        const g = svg.append('g');

        // Create arrow markers for edges
        svg.append('defs').selectAll('marker')
            .data(['REQUIRED', 'RECOMMENDED', 'RELATED'])
            .join('marker')
            .attr('id', d => `arrow-${d}`)
            .attr('viewBox', '0 -5 10 10')
            .attr('refX', 25)
            .attr('refY', 0)
            .attr('markerWidth', 6)
            .attr('markerHeight', 6)
            .attr('orient', 'auto')
            .append('path')
            .attr('fill', d => getEdgeColor(d))
            .attr('d', 'M0,-5L10,0L0,5');

        // Create simulation
        const simulation = d3.forceSimulation<TopicNode>(graphData.nodes)
            .force('link', d3.forceLink<TopicNode, GraphEdge>(graphData.edges)
                .id(d => d.id)
                .distance(120)
                .strength(d => d.strength === 'REQUIRED' ? 1 : 0.5))
            .force('charge', d3.forceManyBody().strength(-300))
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('collision', d3.forceCollide().radius(40));

        simulationRef.current = simulation;

        // Create edges
        const link = g.append('g')
            .attr('class', 'links')
            .selectAll('line')
            .data(graphData.edges)
            .join('line')
            .attr('stroke', d => getEdgeColor(d.strength))
            .attr('stroke-width', d => d.strength === 'REQUIRED' ? 2 : 1)
            .attr('stroke-dasharray', d => d.strength === 'RELATED' ? '4,4' : null)
            .attr('marker-end', d => `url(#arrow-${d.strength})`);

        // Create node groups
        const node = g.append('g')
            .attr('class', 'nodes')
            .selectAll('g')
            .data(graphData.nodes)
            .join('g')
            .attr('cursor', 'pointer')
            .call(d3.drag<any, TopicNode>()
                .on('start', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0.3).restart();
                    d.fx = d.x;
                    d.fy = d.y;
                })
                .on('drag', (event, d) => {
                    d.fx = event.x;
                    d.fy = event.y;
                })
                .on('end', (event, d) => {
                    if (!event.active) simulation.alphaTarget(0);
                    d.fx = null;
                    d.fy = null;
                }));

        // Node circles
        node.append('circle')
            .attr('r', d => 15 + (d.difficulty * 3))
            .attr('fill', d => getStatusColor(d.status, d.progress_percent))
            .attr('stroke', '#1E293B')
            .attr('stroke-width', 2)
            .on('click', (event, d) => {
                setSelectedNode(d);
            });

        // Progress arc
        node.append('path')
            .attr('fill', 'none')
            .attr('stroke', '#FFF')
            .attr('stroke-width', 3)
            .attr('d', d => {
                const r = 15 + (d.difficulty * 3);
                const progress = d.progress_percent / 100;
                const endAngle = progress * 2 * Math.PI - Math.PI / 2;
                const startAngle = -Math.PI / 2;

                const x1 = Math.cos(startAngle) * r;
                const y1 = Math.sin(startAngle) * r;
                const x2 = Math.cos(endAngle) * r;
                const y2 = Math.sin(endAngle) * r;

                const largeArc = progress > 0.5 ? 1 : 0;

                if (progress === 0) return '';
                if (progress >= 1) {
                    return `M ${x1} ${y1} A ${r} ${r} 0 1 1 ${x1 - 0.01} ${y1}`;
                }
                return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
            });

        // Node labels
        node.append('text')
            .attr('dy', d => 25 + (d.difficulty * 3))
            .attr('text-anchor', 'middle')
            .attr('fill', '#E2E8F0')
            .attr('font-size', '11px')
            .attr('font-weight', '500')
            .text(d => d.name.length > 15 ? d.name.substring(0, 15) + '...' : d.name);

        // Simulation tick
        simulation.on('tick', () => {
            link
                .attr('x1', d => (d.source as TopicNode).x!)
                .attr('y1', d => (d.source as TopicNode).y!)
                .attr('x2', d => (d.target as TopicNode).x!)
                .attr('y2', d => (d.target as TopicNode).y!);

            node.attr('transform', d => `translate(${d.x}, ${d.y})`);
        });

        // Center view
        svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(0.8));
    }, [graphData]);

    const handleZoomIn = () => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(
            d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
            1.5
        );
    };

    const handleZoomOut = () => {
        if (!svgRef.current) return;
        const svg = d3.select(svgRef.current);
        svg.transition().duration(300).call(
            d3.zoom<SVGSVGElement, unknown>().scaleBy as any,
            0.67
        );
    };

    const handleReset = () => {
        if (simulationRef.current) {
            simulationRef.current.alpha(1).restart();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500 border-t-transparent"></div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-slate-900">
            {/* Header */}
            <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/student/learning/graph" className="p-2 hover:bg-slate-700 rounded-lg">
                        <ArrowLeft className="w-5 h-5 text-slate-400" />
                    </Link>
                    <h1 className="text-lg font-semibold text-white">Knowledge Graph Visualization</h1>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={handleZoomOut} className="p-2 hover:bg-slate-700 rounded-lg" title="Zoom Out">
                        <ZoomOut className="w-5 h-5 text-slate-400" />
                    </button>
                    <button onClick={handleZoomIn} className="p-2 hover:bg-slate-700 rounded-lg" title="Zoom In">
                        <ZoomIn className="w-5 h-5 text-slate-400" />
                    </button>
                    <button onClick={handleReset} className="p-2 hover:bg-slate-700 rounded-lg" title="Reset Layout">
                        <RefreshCw className="w-5 h-5 text-slate-400" />
                    </button>
                </div>
            </div>

            {/* Graph Container */}
            <div ref={containerRef} className="flex-1 relative">
                <svg ref={svgRef} className="w-full h-full" />

                {/* Legend */}
                <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur rounded-xl p-4 text-sm">
                    <div className="text-slate-400 font-medium mb-2">Node Status</div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            <span className="text-slate-300">Completed</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                            <span className="text-slate-300">In Progress</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                            <span className="text-slate-300">Needs Review</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                            <span className="text-slate-300">Not Started</span>
                        </div>
                    </div>
                    <div className="text-slate-400 font-medium mt-3 mb-2">Edge Type</div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-0.5 bg-red-500"></div>
                            <span className="text-slate-300">Required</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-0.5 bg-amber-500"></div>
                            <span className="text-slate-300">Recommended</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-0.5 border-t border-dashed border-gray-400"></div>
                            <span className="text-slate-300">Related</span>
                        </div>
                    </div>
                </div>

                {/* Selected Node Details */}
                {selectedNode && (
                    <div className="absolute top-4 right-4 bg-slate-800/90 backdrop-blur rounded-xl p-4 w-72">
                        <div className="flex items-start justify-between mb-3">
                            <h3 className="font-semibold text-white">{selectedNode.name}</h3>
                            <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-white">×</button>
                        </div>
                        {selectedNode.subject_code && (
                            <div className="text-sm text-purple-400 mb-2">{selectedNode.subject_code}</div>
                        )}
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <div className="text-slate-500">Progress</div>
                                <div className="text-white font-medium">{selectedNode.progress_percent}%</div>
                            </div>
                            <div>
                                <div className="text-slate-500">Confidence</div>
                                <div className="text-white font-medium">{selectedNode.confidence_score ?? 'N/A'}%</div>
                            </div>
                            <div>
                                <div className="text-slate-500">Difficulty</div>
                                <div className="text-white font-medium">Level {selectedNode.difficulty}</div>
                            </div>
                            <div>
                                <div className="text-slate-500">Status</div>
                                <div className="text-white font-medium capitalize">{selectedNode.status.toLowerCase().replace('_', ' ')}</div>
                            </div>
                        </div>
                        <button className="w-full mt-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
                            Start Learning
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
