import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';
import { Workflow, Circle, Settings, ArrowLeft, Edit3, Save, Plus, Trash2, Play } from 'lucide-react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import BlockSettings from '@/components/BlockSettings';
import { BlockConfig, Block, ConnectionPoint, Connection, BlockType } from '@/automation/types';
import { blockRegistry } from '@/automation/BlockRegistry';
import { useSQLiteContext } from 'expo-sqlite';
import { DatabaseService, type WorkflowWithDates } from '@/services/database';
import { useDatabaseStatus } from '@/services/database/DatabaseProvider';
import { useNostrService } from '@/context/NostrServiceContext';

export default function WorkflowEditorScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [blocks, setBlocks] = useState<Block[]>([
  ]);

  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedConnectionPoint, setSelectedConnectionPoint] = useState<{blockId: string, pointId: string, type: 'input' | 'output'} | null>(null);
  const [blockConfigs, setBlockConfigs] = useState<BlockConfig[]>([]);
  const [showBlockSettings, setShowBlockSettings] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<any>(null);
  const [workflowName, setWorkflowName] = useState<string | null>(null);
  const [workflowActive, setWorkflowActive] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [showBlockPalette, setShowBlockPalette] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [hoveredConnection, setHoveredConnection] = useState<Connection | null>(null);
  const sqliteContext = useSQLiteContext();
  const db = new DatabaseService(sqliteContext);

  const nostrService = useNostrService();

  // Load workflow data from database
  React.useEffect(() => {
    const loadWorkflow = async () => {
      try {
        const workflowData = await db.getWorkflow(id);
        console.log('loaded workflow', workflowData);
        if (workflowData) {
          setWorkflowActive(workflowData.is_active);
          setBlocks(workflowData.data.blocks);
          setConnections(workflowData.data.connections);
          setBlockConfigs(workflowData.data.block_configs);
          setWorkflowName(workflowData.name);
        } else {
          // Workflow doesn't exist, redirect back to automation screen
          console.log('Workflow not found, redirecting to automation screen');
          router.back();
        }
      } catch (error) {
        console.error('Error loading workflow:', error);
        router.back();
      }
    };

    loadWorkflow();
  }, [id]);

  const canvasRef = useRef<View>(null);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'borderPrimary');

  const onGestureEvent = (blockId: string) => (event: any) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      // Get canvas position
      canvasRef.current?.measure((x, y, width, height, pageX, pageY) => {
        const currentBlock = blocks.find(b => b.id === blockId);
        if (!currentBlock) return;
        
        // Calculate position relative to canvas
        const relativeX = event.nativeEvent.absoluteX - pageX - (currentBlock.width / 2);
        const relativeY = event.nativeEvent.absoluteY - pageY - (currentBlock.height / 2);
        
        setBlocks(prevBlocks => {
          const updatedBlocks = prevBlocks.map(block =>
            block.id === blockId
              ? {
                  ...block,
                  x: Math.max(0, Math.min(relativeX, width - currentBlock.width)), // Constrain to canvas bounds
                  y: Math.max(0, Math.min(relativeY, height - currentBlock.height)),
                }
              : block
          );
          return updatedBlocks;
        });
      });
    }
  };

  const handleConnectionPointPress = (blockId: string, pointId: string, type: 'input' | 'output') => {
    console.log('Connection point pressed:', { blockId, pointId, type, selectedConnectionPoint });
    
    // Check if there are any connections for this point
    const connectionsForPoint = connections.filter(conn => 
      (conn.fromBlockId === blockId && conn.fromOutputId === pointId && type === 'output') ||
      (conn.toBlockId === blockId && conn.toInputId === pointId && type === 'input')
    );
    
    if (connectionsForPoint.length > 0) {
      // Show delete button for existing connections
      setHoveredConnection(connectionsForPoint[0]);
      setSelectedConnectionPoint(null);
      return;
    }
    
    if (selectedConnectionPoint) {
      // If we already have a selected point, try to create a connection
      if (selectedConnectionPoint.blockId !== blockId && selectedConnectionPoint.type !== type) {
        const fromBlock = blocks.find(b => b.id === (type === 'output' ? blockId : selectedConnectionPoint.blockId));
        const toBlock = blocks.find(b => b.id === (type === 'input' ? blockId : selectedConnectionPoint.blockId));
        
        const newConnection: Connection = {
          id: `conn-${Date.now()}`,
          fromBlockId: type === 'output' ? blockId : selectedConnectionPoint.blockId,
          fromOutputId: type === 'output' ? pointId : selectedConnectionPoint.pointId,
          toBlockId: type === 'input' ? blockId : selectedConnectionPoint.blockId,
          toInputId: type === 'input' ? pointId : selectedConnectionPoint.pointId,
        };
        
        // Check if this connection already exists
        const connectionExists = connections.some(conn => 
          (conn.fromBlockId === newConnection.fromBlockId && 
           conn.fromOutputId === newConnection.fromOutputId && 
           conn.toBlockId === newConnection.toBlockId && 
           conn.toInputId === newConnection.toInputId) ||
          (conn.fromBlockId === newConnection.toBlockId && 
           conn.fromOutputId === newConnection.toInputId && 
           conn.toBlockId === newConnection.fromBlockId && 
           conn.toInputId === newConnection.fromOutputId)
        );
        
        if (!connectionExists) {
          console.log('Creating connection:', newConnection);
          setConnections(prev => [...prev, newConnection]);
        }
        
        setSelectedConnectionPoint(null);
      } else {
        // Same block or same type, just update selection
        setSelectedConnectionPoint({ blockId, pointId, type });
      }
    } else {
      // First point selected
      setSelectedConnectionPoint({ blockId, pointId, type });
    }
  };

  const handleBlockPress = (block: any) => {
    setSelectedBlock(block);
    setShowBlockSettings(true);
  };

  const handleSaveBlockConfig = (config: BlockConfig) => {
    setBlockConfigs(prev => {
      const existingIndex = prev.findIndex(c => c.blockId === config.blockId);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = config;
        return updated;
      }
      return [...prev, config];
    });
  };

  const handleDeleteBlock = (blockId: string) => {
    // Remove the block
    setBlocks(prev => prev.filter(block => block.id !== blockId));
    
    // Remove all connections involving this block
    setConnections(prev => prev.filter(connection => 
      connection.fromBlockId !== blockId && connection.toBlockId !== blockId
    ));
    
    // Remove block configs for this block
    setBlockConfigs(prev => prev.filter(config => config.blockId !== blockId));
  };

  const handleDeleteConnection = (connectionId: string) => {
    setConnections(prev => prev.filter(connection => connection.id !== connectionId));
  };

  const handleSaveName = () => {
    setIsEditingName(false);
    saveWorkflow();
  };

    const saveWorkflow = async () => {
    try {
      await db.updateWorkflow(id, {
        name: (workflowName ?? 'Workflow') as string,
        data: {
          blocks,
          connections,
          block_configs: blockConfigs
        },
        is_active: workflowActive
      });
    } catch (error) {
      console.error('Error saving workflow:', error);
    }
  };

  // Auto-save when blocks, connections, or configs change
  React.useEffect(() => {
    if (id && workflowName !== null) {
      saveWorkflow();
    }
  }, [blocks, connections, blockConfigs, workflowName]);

  const addBlock = (blockType: string) => {
    console.log('Adding block:', blockType);
    const blockTypeData = blockRegistry.getBlock(blockType);
    if (!blockTypeData) {
      console.log('Block type not found:', blockType);
      return;
    }

    const newBlock: Block = {
      id: `block-${Date.now()}`,
      x: 200,
      y: 200,
      type: blockType,
      title: blockTypeData.name,
      width: blockTypeData.getWidth(),
      height: blockTypeData.getHeight()
    };

    console.log('Created new block:', newBlock);
    setBlocks(prev => [...prev, newBlock]);
    setShowBlockPalette(false);
  };

  const recurse = async (block: Block) => {
    console.log('Recursing block:', block.id);
    const blockTypeData = blockRegistry.getBlock(block.type);
    const blockConfig = blockConfigs.find(c => c.blockId === block.id);
    const toBlock = connections.filter(conn => conn.toBlockId === block.id);

    const incomingPromises = await Promise.all(toBlock.map(conn => {
      const blockId = conn.fromBlockId;
      const block = blocks.find(b => b.id === blockId);
      if (block) {
        return recurse(block)
          .then(value => {
            if (!value[conn.fromOutputId]) {
              throw new Error(`Block ${block.id} output ${conn.fromOutputId} not found`);
            } 

            const obj: any = {};
            obj[conn.toInputId] = value[conn.fromOutputId];
            return obj;
          })
      } else {
          return Promise.resolve(null);
      }
    }));

    const mergedPromises = incomingPromises.reduce((acc, curr) => {
      return { ...acc, ...curr };
    }, {});

    console.log('Block', block.id, 'Incoming promises:', mergedPromises);
    try {
      const res = await blockTypeData?.run([mergedPromises], blockConfig, nostrService);
      console.log('results', res);
      return res;
    } catch (e) {
      console.warn(e);
      throw e;
    }
  }

  const runWorkflow = async () => {
    // Find leaf blocks with no outputs connections
    const leafBlocks = blocks.filter(block => {
      const fromConnections = connections.filter(conn => conn.fromBlockId === block.id);
      return fromConnections.length === 0;
    });

    console.log('Leaf blocks:', leafBlocks);
    const results = await Promise.any(leafBlocks.map(block => recurse(block)));
    console.log('Run completed', results);
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={primaryTextColor} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            {isEditingName ? (
              <View style={styles.nameEditContainer}>
                <TextInput
                  style={[styles.nameInput, { color: primaryTextColor, borderColor }]}
                  value={workflowName || ''}
                  onChangeText={setWorkflowName}
                  autoFocus
                  onBlur={handleSaveName}
                  onSubmitEditing={handleSaveName}
                />
                <TouchableOpacity onPress={handleSaveName} style={styles.saveButton}>
                  <Save size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.nameDisplayContainer}>
                <ThemedText style={[styles.headerTitle, { color: primaryTextColor }]}>
                  {workflowName || 'Loading...'}
                </ThemedText>
                <TouchableOpacity onPress={() => setIsEditingName(true)} style={styles.editButton}>
                  <Edit3 size={16} color={primaryTextColor} />
                </TouchableOpacity>
              </View>
            )}
                           </View>
                 <View style={styles.headerButtons}>
                   <TouchableOpacity
                     style={[styles.runWorkflowButton, { backgroundColor: Colors.success }]}
                     onPress={runWorkflow}
                   >
                     <Play size={20} color="white" />
                     <ThemedText style={styles.runWorkflowButtonText}>Run</ThemedText>
                   </TouchableOpacity>
                   <TouchableOpacity
                     style={[styles.addBlockButton, { backgroundColor: Colors.primary }]}
                     onPress={() => setShowBlockPalette(true)}
                   >
                     <Plus size={20} color="white" />
                   </TouchableOpacity>
                 </View>
               </View>

        {/* Canvas */}
        <TouchableOpacity
          style={[styles.canvasContainer, { backgroundColor: cardBackgroundColor }]}
          activeOpacity={1}
          onPress={() => setHoveredConnection(null)}
        >
          <View
            ref={canvasRef}
            style={[styles.canvas, { borderColor }]}
          >
            {/* Render connections */}
            {connections.map((connection) => {
              const fromBlock = blocks.find(b => b.id === connection.fromBlockId);
              const toBlock = blocks.find(b => b.id === connection.toBlockId);
              
              if (!fromBlock || !toBlock) return null;
              
              const fromOutput = blockRegistry.getBlock(fromBlock.type)?.getOutputs().find(o => o.id === connection.fromOutputId);
              const toInput = blockRegistry.getBlock(toBlock.type)?.getInputs().find(i => i.id === connection.toInputId);
              
              if (!fromOutput || !toInput) return null;
              
              const fromX = fromBlock.x + fromOutput.x + 5;
              const fromY = fromBlock.y + fromOutput.y + 5;
              const toX = toBlock.x + toInput.x + 5;
              const toY = toBlock.y + toInput.y + 5;
              
              const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
              const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
              
              // Calculate position for delete button (middle of the connection)
              const midX = (fromX + toX) / 2;
              const midY = (fromY + toY) / 2;
              
              return (
                <View key={connection.id}>
                  <View
                    style={[
                      styles.connection,
                      {
                        left: fromX + 2,
                        top: fromY + 2,
                        width: length,
                        transform: [{ rotate: `${angle}deg` }],
                        transformOrigin: '0 0',
                      }
                    ]}
                  />
                  {/* Start circle */}
                  <View
                    style={[
                      styles.connectionEndPoint,
                      {
                        left: fromX,
                        top: fromY,
                      }
                    ]}
                  />
                  {/* End circle */}
                  <View
                    style={[
                      styles.connectionEndPoint,
                      {
                        left: toX,
                        top: toY,
                      }
                    ]}
                  />
                  
                  {/* Floating delete button */}
                  {hoveredConnection?.id === connection.id && (
                    <TouchableOpacity
                      style={[
                        styles.floatingDeleteButton,
                        {
                          left: midX - 12,
                          top: midY - 12,
                        }
                      ]}
                      onPress={() => {
                        handleDeleteConnection(connection.id);
                        setHoveredConnection(null);
                      }}
                    >
                      <Trash2 size={12} color="white" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}
            
            {blocks.map((block) => (
              <PanGestureHandler
                key={block.id}
                onGestureEvent={onGestureEvent(block.id)}
              >
                <TouchableOpacity
                  style={[
                    styles.block,
                    {
                      left: block.x,
                      top: block.y,
                      width: block.width,
                      height: block.height,
                      backgroundColor: block.type === 'trigger' ? Colors.primary : 
                                    block.type === 'conditional' ? Colors.warning : Colors.secondary,
                    }
                  ]}
                  onPress={() => handleBlockPress(block)}
                >
                  <View style={styles.blockContent}>
                    <ThemedText style={styles.blockTitle}>
                      {block.title}
                    </ThemedText>
                  </View>
                  
                  {/* Settings indicator */}
                  <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => handleBlockPress(block)}
                  >
                    <Settings size={12} color="white" />
                  </TouchableOpacity>
                  
                  {/* Delete button */}
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteBlock(block.id)}
                  >
                    <Trash2 size={12} color="white" />
                  </TouchableOpacity>
                  
                  {/* Render connection points */}
                  {blockRegistry.getBlock(block.type)?.getOutputs().map((output) => (
                    <React.Fragment key={output.id}>
                      <TouchableOpacity
                        style={[
                          styles.connectionPoint,
                          {
                            left: output.x,
                            top: output.y,
                            backgroundColor: selectedConnectionPoint?.blockId === block.id && 
                                          selectedConnectionPoint?.pointId === output.id ? 
                                          Colors.success : Colors.white,
                            borderColor: block.type === 'trigger' ? Colors.primary : 
                                        block.type === 'conditional' ? Colors.warning : Colors.secondary,
                          }
                        ]}
                        onPress={() => handleConnectionPointPress(block.id, output.id, 'output')}
                      >
                        <Circle size={8} color={block.type === 'trigger' ? Colors.primary : 
                                               block.type === 'conditional' ? Colors.warning : Colors.secondary} />
                      </TouchableOpacity>
                      {output.label && (
                        <ThemedText style={[
                          styles.connectionLabel,
                          {
                            left: output.x - (output.label.length * 1.2),
                            top: output.y - 18,
                            color: 'white',
                          }
                        ]}>
                          {output.label}
                        </ThemedText>
                      )}
                    </React.Fragment>
                  ))}
                  
                  {blockRegistry.getBlock(block.type)?.getInputs().map((input) => (
                    <React.Fragment key={input.id}>
                      <TouchableOpacity
                        style={[
                          styles.connectionPoint,
                          {
                            left: input.x,
                            top: input.y,
                            backgroundColor: selectedConnectionPoint?.blockId === block.id && 
                                          selectedConnectionPoint?.pointId === input.id ? 
                                          Colors.success : Colors.white,
                            borderColor: block.type === 'trigger' ? Colors.primary : 
                                        block.type === 'conditional' ? Colors.warning : Colors.secondary,
                          }
                        ]}
                        onPress={() => handleConnectionPointPress(block.id, input.id, 'input')}
                      >
                        <Circle size={8} color={block.type === 'trigger' ? Colors.primary : 
                                               block.type === 'conditional' ? Colors.warning : Colors.secondary} />
                      </TouchableOpacity>
                      {input.label && (
                        <ThemedText style={[
                          styles.connectionLabel,
                          {
                            left: input.x - (input.label.length * 1.2),
                            top: input.y + 8,
                            color: 'white',
                          }
                        ]}>
                          {input.label}
                        </ThemedText>
                      )}
                    </React.Fragment>
                  ))}
                </TouchableOpacity>
              </PanGestureHandler>
            ))}
          </View>
        </TouchableOpacity>


      </ThemedView>
      
      {/* Block Settings Modal */}
      {showBlockSettings && selectedBlock && (
        <BlockSettings
          block={selectedBlock}
          onClose={() => {
            setShowBlockSettings(false);
            setSelectedBlock(null);
          }}
          onSave={handleSaveBlockConfig}
          initialConfig={blockConfigs.find(c => c.blockId === selectedBlock.id)}
          connections={connections}
          blocks={blocks}
        />
      )}

      {/* Block Palette Modal */}
      {showBlockPalette && (
        <View style={styles.modalOverlay}>
          <View style={[styles.blockPalette, { backgroundColor: cardBackgroundColor }]}>
            <View style={styles.paletteHeader}>
              <ThemedText style={[styles.paletteTitle, { color: primaryTextColor }]}>
                Add Block
              </ThemedText>
              <TouchableOpacity onPress={() => setShowBlockPalette(false)}>
                <ThemedText style={[styles.closeButton, { color: primaryTextColor }]}>✕</ThemedText>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.paletteContent}>
              {(() => {
                const blocks = blockRegistry.getAllBlocks();
                console.log('Available blocks:', blocks.map(b => ({ id: b.id, name: b.name })));
                
                if (blocks.length === 0) {
                  return (
                    <View style={styles.emptyPalette}>
                      <ThemedText style={[styles.emptyPaletteText, { color: secondaryTextColor }]}>
                        No blocks available
                      </ThemedText>
                    </View>
                  );
                }
                
                return blocks.map((blockType) => (
                  <TouchableOpacity
                    key={blockType.id}
                    style={[styles.blockOption, { borderColor }]}
                    onPress={() => addBlock(blockType.id)}
                  >
                    <ThemedText style={[styles.blockOptionText, { color: primaryTextColor }]}>
                      {blockType.name}
                    </ThemedText>
                  </TouchableOpacity>
                ));
              })()}
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backButton: {
    marginRight: 16,
    padding: 4,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  nameDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    marginLeft: 8,
    padding: 4,
  },
  nameEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  nameInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  saveButton: {
    marginLeft: 8,
    padding: 4,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  runWorkflowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 36,
  },
  runWorkflowButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  addBlockButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minHeight: 36,
  },
  canvasContainer: {
    flex: 1,
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    borderWidth: 2,
    borderStyle: 'dashed',
    position: 'relative',
  },
  block: {
    position: 'absolute',
    borderRadius: 8,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  blockContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockTitle: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  connection: {
    position: 'absolute',
    height: 2,
    zIndex: 10,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: Colors.gray500,
  },
  connectionPoint: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
    zIndex: 2,
  },
  connectionEndPoint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
    zIndex: 11,
  },
  connectionLabel: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    minWidth: 10,
  },
  settingsButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  deleteButton: {
    position: 'absolute',
    top: 4,
    right: 28,
    padding: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(220, 53, 69, 0.8)',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  blockPalette: {
    width: '80%',
    maxHeight: '85%',
    minHeight: 400,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  paletteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  paletteTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  paletteContent: {
    flex: 1,
    padding: 16,
  },
  blockOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    minHeight: 60,
  },
  blockOptionText: {
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 12,
  },
  emptyPalette: {
    padding: 20,
    alignItems: 'center',
  },
  emptyPaletteText: {
    fontSize: 16,
    textAlign: 'center',
  },
  deleteConnectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  deleteConnectionCard: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteConnectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  deleteConnectionText: {
    fontSize: 14,
    marginBottom: 20,
    textAlign: 'center',
  },
  deleteConnectionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  deleteConnectionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  confirmDeleteButton: {
    borderWidth: 0,
  },
  deleteConnectionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  confirmDeleteButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  floatingDeleteButton: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
}); 