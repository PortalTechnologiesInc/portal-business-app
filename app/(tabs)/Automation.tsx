import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';
import { Workflow, Plus, Trash2, Edit3 } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { DatabaseService, type WorkflowWithDates } from '@/services/database';
import { useDatabaseStatus } from '@/services/database/DatabaseProvider';

interface Workflow {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

export default function AutomationScreen() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const sqliteContext = useSQLiteContext();
  const db = new DatabaseService(sqliteContext);

  // Load workflows from database
  React.useEffect(() => {
    const loadWorkflows = async () => {
      try {
        const dbWorkflows = await db.getWorkflows();
        setWorkflows(dbWorkflows.map(w => ({
          id: w.id,
          name: w.name,
          createdAt: w.created_at.toISOString().split('T')[0],
          updatedAt: w.updated_at.toISOString().split('T')[0],
          isActive: w.is_active
        })));
      } catch (error) {
        console.error('Error loading workflows:', error);
        setWorkflows([]);
      }
    };

    loadWorkflows();
  }, []);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'borderPrimary');

  const handleCreateWorkflow = async () => {
    try {
      const workflowName = `Workflow ${workflows.length + 1}`;
      
      // Create empty workflow in database
      const newId = await db.addWorkflow({
        name: workflowName,
        data: {
          blocks: [],
          connections: [],
          block_configs: []
        },
        is_active: false
      });
      
      // Add to local state
      setWorkflows(prev => [...prev, {
        id: newId,
        name: workflowName,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        isActive: false
      }]);
      
      router.push(`/workflow/${newId}`);
    } catch (error) {
      console.error('Error creating workflow:', error);
    }
  };

  const handleEditWorkflow = (workflowId: string) => {
    router.push(`/workflow/${workflowId}`);
  };

  const handleDeleteWorkflow = async (workflowId: string) => {
    try {
      await db.deleteWorkflow(workflowId);
      setWorkflows(prev => prev.filter(w => w.id !== workflowId));
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  const handleToggleWorkflow = async (workflowId: string) => {
    try {
      await db.toggleWorkflowActive(workflowId);
      setWorkflows(prev => prev.map(w => 
        w.id === workflowId ? { ...w, isActive: !w.isActive, updatedAt: new Date().toISOString().split('T')[0] } : w
      ));
    } catch (error) {
      console.error('Error toggling workflow:', error);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={[styles.headerTitle, { color: primaryTextColor }]}>
            Workflows
          </ThemedText>
          <TouchableOpacity 
            style={[styles.addButton, { backgroundColor: Colors.primary }]}
            onPress={handleCreateWorkflow}
          >
            <Plus size={20} color="white" />
            <ThemedText style={styles.addButtonText}>New Workflow</ThemedText>
          </TouchableOpacity>
        </View>

        {/* Workflows List */}
        <ScrollView style={styles.workflowsList} showsVerticalScrollIndicator={false}>
          {workflows.map((workflow) => (
            <View key={workflow.id} style={[styles.workflowCard, { backgroundColor: cardBackgroundColor, borderColor }]}>
              <View style={styles.workflowHeader}>
                <View style={styles.workflowInfo}>
                  <ThemedText style={[styles.workflowName, { color: primaryTextColor }]}>
                    {workflow.name}
                  </ThemedText>

                  <View style={styles.workflowMeta}>
                    <ThemedText style={[styles.workflowDate, { color: secondaryTextColor }]}>
                      Updated {workflow.updatedAt}
                    </ThemedText>
                    <View style={[styles.statusBadge, { backgroundColor: workflow.isActive ? Colors.success : Colors.gray500 }]}>
                      <ThemedText style={styles.statusText}>
                        {workflow.isActive ? 'Active' : 'Inactive'}
                      </ThemedText>
                    </View>
                  </View>
                </View>
                
                <View style={styles.workflowActions}>
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleToggleWorkflow(workflow.id)}
                  >
                    <Workflow size={16} color={workflow.isActive ? Colors.success : Colors.gray500} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleEditWorkflow(workflow.id)}
                  >
                    <Edit3 size={16} color={Colors.primary} />
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => handleDeleteWorkflow(workflow.id)}
                  >
                    <Trash2 size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
          
          {workflows.length === 0 && (
            <View style={styles.emptyState}>
              <Workflow size={48} color={secondaryTextColor} />
              <ThemedText style={[styles.emptyStateTitle, { color: primaryTextColor }]}>
                No Workflows Yet
              </ThemedText>
              <ThemedText style={[styles.emptyStateDescription, { color: secondaryTextColor }]}>
                Create your first workflow to get started with automation
              </ThemedText>
            </View>
          )}
        </ScrollView>
      </ThemedView>
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
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  workflowsList: {
    flex: 1,
  },
  workflowCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
  workflowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  workflowInfo: {
    flex: 1,
  },
  workflowName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  workflowDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  workflowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workflowDate: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  workflowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  actionButton: {
    padding: 8,
    marginLeft: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateDescription: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
}); 