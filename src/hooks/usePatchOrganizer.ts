import React, { useEffect, useCallback } from 'react';
import { IOConnection, IOlet, ObjectNode, Node, MessageNode, Patch } from '@/lib/nodes/types';


// Identifies all subgraphs within the given nodes
const identifySubgraphs = (nodes: Node[]): Set<Set<Node>> => {
    const visited = new Set<string>(); // To keep track of visited nodes
    const subgraphs = new Set<Set<Node>>(); // A set of sets, each representing a subgraph

    const bfs = (start: Node, subgraph: Set<Node>) => {
        const queue: Node[] = [start];
        while (queue.length > 0) {
            const node = queue.shift()!;
            if (!visited.has(node.id)) {
                visited.add(node.id);
                subgraph.add(node);

                // Add all connected nodes to the queue for BFS
                node.inlets.concat(node.outlets).forEach(iolet => {
                    iolet.connections.forEach(connection => {
                        if (!visited.has(connection.destination.id)) {
                            queue.push(connection.destination);
                        }
                        if (!visited.has(connection.source.id)) {
                            queue.push(connection.source);
                        }
                    });
                });
            }
        }
    };

    nodes.forEach(node => {
        if (!visited.has(node.id)) {
            const subgraph = new Set<Node>();
            bfs(node, subgraph);
            subgraphs.add(subgraph);
        }
    });

    return subgraphs;
};

// A utility function to find a node by its ID
const findNodeById = (nodes: Node[], id: string): Node | undefined => {
    return nodes.find(node => node.id === id);
};

const determineNodeLevels = (nodes: Node[]): Map<string, number> => {
    const levels: Map<string, number> = new Map();
    const visited: Set<string> = new Set();
    const inDegree: Map<string, number> = new Map(nodes.map(node => [node.id, node.inlets.reduce((acc, inlet) => acc + inlet.connections.length, 0)]));

    // Initialize levels for nodes with no incoming connections
    const queue: Node[] = nodes.filter(node => inDegree.get(node.id) === 0);
    queue.forEach(node => levels.set(node.id, 0));

    while (queue.length > 0) {
        const node = queue.shift()!;
        const currentLevel = levels.get(node.id)!;

        node.outlets.forEach(outlet => {
            outlet.connections.forEach(connection => {
                const childId = connection.destination.id;
                const childNode = connection.destination;
                const childInDegree = inDegree.get(childId)! - 1;
                inDegree.set(childId, childInDegree);

                const newLevel = currentLevel + 1;
                const existingLevel = levels.get(childId);
                if (existingLevel === undefined || newLevel > existingLevel) {
                    levels.set(childId, newLevel);
                }

                if (childInDegree === 0) {
                    queue.push(childNode);
                }
            });
        });
    }

    // Handle nodes not reachable due to cycles or isolated from the initial traversal
    nodes.forEach(node => {
        if (!visited.has(node.id) && !levels.has(node.id)) {
            // Assign a default level or handle specially
            levels.set(node.id, 1); // Example: Assign to level 1 or handle based on your graph's needs
        }
    });

    return levels;
};

const calculateInitialPlacement = (subgraphs: Set<Set<Node>>): Map<string, { x: number, y: number }> => {
    const positions = new Map<string, { x: number, y: number }>();

    // Constants for layout
    const horizontalSpacing = 20; // Space between nodes horizontally
    const verticalSpacing = 50; // Space between levels vertically

    // Track the maximum height of nodes at each level to adjust y position dynamically
    const maxHeightAtLevel: Map<number, number> = new Map();

    subgraphs.forEach(subgraph => {
        let levels = determineNodeLevels(Array.from(subgraph));
        let nodesByLevel: Map<number, Node[]> = new Map();

        // Populate nodesByLevel map and track maximum height at each level
        subgraph.forEach(node => {
            const level = levels.get(node.id);
            if (level !== undefined) {
                if (!nodesByLevel.has(level)) {
                    nodesByLevel.set(level, []);
                }
                let l = nodesByLevel.get(level);
                if (l) {
                    l.push(node);
                }

                // Update maximum height at this level
                let size = node.size || { width: 50, height: 15 };
                const currentMaxHeight = maxHeightAtLevel.get(level) || 0;
                if (size.height > currentMaxHeight) {
                    maxHeightAtLevel.set(level, size.height);
                }
            }
        });

        // Calculate cumulative heights to determine y offsets for each level
        let cumulativeHeight = 0;
        let levelHeights: Map<number, number> = new Map();
        Array.from(maxHeightAtLevel.keys()).sort((a, b) => a - b).forEach((level, index) => {
            levelHeights.set(level, cumulativeHeight);
            cumulativeHeight += (maxHeightAtLevel.get(level) || 0) + verticalSpacing;
        });

        // Go through each level and assign x, y positions
        nodesByLevel.forEach((nodes, level) => {
            let xOffset = 0; // Start x position for the first node at this level
            const yOffset = levelHeights.get(level) || 0;

            nodes.forEach(node => {
                positions.set(node.id, { x: xOffset, y: yOffset });

                let size = node.size || { width: 40, height: 15 };
                // Update xOffset for the next node, adding horizontal spacing
                xOffset += size.width + horizontalSpacing;
            });
        });
    });

    return positions;
};


function minimizeEdgeCrossings(nodes: Node[], positions: Map<string, { x: number, y: number }>, levels: Map<string, number>): Map<string, { x: number, y: number }> {
    // Group nodes by level
    const nodesByLevel: Map<number, Node[]> = new Map();
    levels.forEach((level, nodeId) => {
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
            if (!nodesByLevel.has(level)) {
                nodesByLevel.set(level, []);
            }
            let l = nodesByLevel.get(level);
            if (l) {
                l.push(node);
            }
        }
    });

    // Sort nodes within each level based on the barycenter heuristic
    nodesByLevel.forEach((levelNodes, level) => {
        // Calculate barycenter for each node
        const barycenters: Map<string, number> = new Map();
        levelNodes.forEach(node => {
            let sumPositions = 0;
            let count = 0;
            node.inlets.forEach(inlet => {
                inlet.connections.forEach(connection => {
                    const sourcePosition = positions.get(connection.source.id);
                    if (sourcePosition) {
                        sumPositions += sourcePosition.x;
                        count++;
                    }
                });
            });
            node.outlets.forEach(outlet => {
                outlet.connections.forEach(connection => {
                    const destPosition = positions.get(connection.destination.id);
                    if (destPosition) {
                        sumPositions += destPosition.x;
                        count++;
                    }
                });
            });
            const barycenter = count > 0 ? sumPositions / count : 0;
            barycenters.set(node.id, barycenter);
        });

        // Sort nodes within the level by their barycenter
        levelNodes.sort((a, b) => (barycenters.get(a.id) || 0) - (barycenters.get(b.id) || 0));

        // Update positions for the sorted nodes, maintaining the horizontal spacing
        let xOffset = 0; // Reset xOffset for each level
        const horizontalSpacing = 50; // Assume some horizontal spacing
        levelNodes.forEach(node => {
            positions.set(node.id, { x: xOffset, y: positions.get(node.id)!.y });
            let size = node.size || { width: 50, height: 20 };
            xOffset += size.width + horizontalSpacing;
        });
    });

    return positions;
}


function adjustParentlessNodesPositions(nodes: Node[], positions: Map<string, { x: number, y: number }>, levels: Map<string, number>): Map<string, { x: number, y: number }> {
    // Copy positions to avoid mutating the original map
    const updatedPositions = new Map<string, { x: number, y: number }>(positions);

    nodes.forEach(node => {
        // Determine if the node is parentless (has no inlets with connections)
        const isParentless = node.inlets.every(inlet => inlet.connections.length === 0);

        if (!isParentless) {
            // For each inlet, find parentless parents and adjust their position
            node.inlets.forEach((inlet, inletIndex) => {
                inlet.connections.forEach(connection => {
                    const parent = connection.source;
                    const parentIsParentless = parent.inlets.every(inlet => inlet.connections.length === 0);
                    if (parentIsParentless) {
                        // Calculate new position for the parentless parent
                        const childPosition = positions.get(node.id);
                        let size = node.size || { width: 45, height: 15 };
                        let parentSize = parent.size || { width: 45, height: 15 };
                        const inletSpacing = size.width / (node.inlets.length + 1);
                        const newX = childPosition!.x + inletSpacing * (inletIndex + 1) - (parentSize.width / 2);
                        const newY = childPosition!.y - parentSize.height - 15; // 15 pixels above

                        updatedPositions.set(parent.id, { x: newX, y: newY });
                    }
                });
            });
        }
    });

    return updatedPositions;
}

export const usePatchOrganizer = () => {
    const organize = (patch: Patch) => {
        let allNodes = [...patch.objectNodes, ...patch.messageNodes];
        let subgraphs = identifySubgraphs(allNodes);

        let max = -1;
        let maxGraph;
        subgraphs.forEach(graph => {
            if (graph.size > max) {
                max = graph.size;
                maxGraph = graph;
            }
        });

        if (!maxGraph) {
            return;
        }

        let levels = determineNodeLevels(Array.from(maxGraph));
        let placement = calculateInitialPlacement(new Set([maxGraph]));
        console.log("placement=", placement);

        placement = minimizeEdgeCrossings(Array.from(maxGraph), placement, levels);
        placement = adjustParentlessNodesPositions(Array.from(maxGraph), placement, levels);

        let update: any = {};

        placement.forEach((value, key) => {
            update[key] = value;
            let n = allNodes.find(x => x.id === key)
            if (n) {
                n.position = update[key];
            }
        });

        return update;
    };



    return { organize };
};
