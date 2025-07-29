import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Colors } from '@/constants/Colors';
import { X } from 'lucide-react-native';
import { BlockParameter, BlockConfig, DataField } from '@/automation/types';
import { blockRegistry } from '@/automation/BlockRegistry';

interface BlockSettingsProps {
  block: any; // The block being configured
  onClose: () => void;
  onSave: (config: BlockConfig) => void;
  initialConfig?: BlockConfig;
  connections?: any[]; // All connections to get input data
  blocks?: any[]; // All blocks to find connected blocks
}

export default function BlockSettings({ block, onClose, onSave, initialConfig, connections = [], blocks = [] }: BlockSettingsProps) {
  const [config, setConfig] = useState<{ [key: string]: string | number }>(
    initialConfig?.parameters || {}
  );

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const borderColor = useThemeColor({}, 'borderPrimary');
  const buttonPrimaryColor = useThemeColor({}, 'buttonPrimary');
  const buttonPrimaryTextColor = useThemeColor({}, 'buttonPrimaryText');

  const blockType = blockRegistry.getBlock(block.type);
  if (!blockType) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={{ color: primaryTextColor }}>
            Unknown Block Type
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  const getAvailableInputFields = (): DataField[] => {
    const inputFields: DataField[] = [];
    
    // Find connections where this block is the target
    const incomingConnections = connections.filter(conn => conn.toBlockId === block.id);
    
    incomingConnections.forEach(connection => {
      const fromBlock = blocks.find(b => b.id === connection.fromBlockId);
      if (fromBlock) {
        const blockType = blockRegistry.getBlock(fromBlock.type);
        const output = blockType?.getOutputs().find(o => o.id === connection.fromOutputId);
        if (output?.dataFields) {
          inputFields.push(...output.dataFields);
        }
      }
    });
    
    return inputFields;
  };

  const handleParameterChange = (parameterId: string, value: string | number) => {
    const updatedConfig = {
      ...config,
      [parameterId]: value
    };
    setConfig(updatedConfig);
    
    // Auto-save the configuration
    const blockConfig: BlockConfig = {
      id: initialConfig?.id || `config-${Date.now()}`,
      blockId: block.id,
      parameters: updatedConfig
    };
    onSave(blockConfig);
  };

  const renderParameterInput = (parameter: BlockParameter) => {
    const value = config[parameter.id]?.toString() || parameter.defaultValue?.toString() || '';

    switch (parameter.type) {
      case 'select':
        return (
          <View style={styles.selectContainer}>
            {parameter.options?.map((option) => (
              <TouchableOpacity
                key={option}
                style={[
                  styles.selectOption,
                  {
                    backgroundColor: value === option ? buttonPrimaryColor : cardBackgroundColor,
                    borderColor: borderColor,
                  }
                ]}
                onPress={() => handleParameterChange(parameter.id, option)}
              >
                <ThemedText
                  style={[
                    styles.selectOptionText,
                    { color: value === option ? buttonPrimaryTextColor : primaryTextColor }
                  ]}
                >
                  {option}
                </ThemedText>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'number':
        return (
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: cardBackgroundColor,
                borderColor: borderColor,
                color: primaryTextColor,
              }
            ]}
            value={value}
            onChangeText={(text) => handleParameterChange(parameter.id, text)}
            placeholder={parameter.placeholder}
            placeholderTextColor={secondaryTextColor}
            keyboardType="numeric"
          />
        );

      default: // text, url
        return (
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: cardBackgroundColor,
                borderColor: borderColor,
                color: primaryTextColor,
              }
            ]}
            value={value}
            onChangeText={(text) => handleParameterChange(parameter.id, text)}
            placeholder={parameter.placeholder}
            placeholderTextColor={secondaryTextColor}
            keyboardType={parameter.type === 'url' ? 'url' : 'default'}
            autoCapitalize="none"
            autoCorrect={false}
          />
        );
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        {/* Header with Close Button */}
        <View style={styles.sectionHeader}>
          <ThemedText style={[styles.sectionTitle, { color: primaryTextColor }]}>
            {getAvailableInputFields().length > 0 ? 'Available Input Fields' : 'Block Settings'}
          </ThemedText>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={20} color={primaryTextColor} />
          </TouchableOpacity>
        </View>

        {/* Available Input Fields */}
        {getAvailableInputFields().length > 0 && (
          <View style={styles.sectionContainer}>
            <ScrollView 
              style={styles.inputFieldsScrollView} 
              horizontal 
              showsHorizontalScrollIndicator={false}
            >
              <View style={styles.inputFieldsContainer}>
                {getAvailableInputFields().map((field, index) => (
                  <View key={index} style={[styles.inputFieldItem, { backgroundColor: cardBackgroundColor, borderColor }]}>
                    <ThemedText style={[styles.fieldName, { color: primaryTextColor }]}>
                      {field.name}
                    </ThemedText>
                    <ThemedText style={[styles.fieldType, { color: secondaryTextColor }]}>
                      {field.type}
                    </ThemedText>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Parameters */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {blockType.getSettings().map((parameter: BlockParameter) => (
            <View key={parameter.id} style={styles.parameterContainer}>
              <View style={styles.parameterHeader}>
                <ThemedText style={[styles.parameterName, { color: primaryTextColor }]}>
                  {parameter.name}
                </ThemedText>
                {parameter.required && (
                  <ThemedText style={[styles.required, { color: Colors.error }]}>
                    *
                  </ThemedText>
                )}
              </View>
              {renderParameterInput(parameter)}
            </View>
          ))}
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
    paddingTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  closeButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  parameterContainer: {
    marginBottom: 24,
  },
  parameterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  parameterName: {
    fontSize: 16,
    fontWeight: '600',
  },
  required: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  selectContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  selectOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  selectOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  inputFieldsScrollView: {
    maxHeight: 120,
  },
  inputFieldsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 4,
  },
  inputFieldItem: {
    padding: 6,
    borderRadius: 6,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  fieldName: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  fieldType: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
  },
}); 