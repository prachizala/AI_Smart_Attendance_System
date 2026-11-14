import React, { useState, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Eye, EyeOff } from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

export default function PasswordInput({
  value,
  onChangeText,
  placeholder = 'Enter password',
  placeholderTextColor,
  containerStyle,
  inputStyle,
  autoCapitalize = 'none',
  editable = true,
  onSubmitEditing,
  returnKeyType = 'done',
  ...rest
}) {
  const { colors } = useTheme();
  const [showPassword, setShowPassword] = useState(false);

  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={placeholderTextColor || colors.textMuted}
        secureTextEntry={!showPassword}
        autoCapitalize={autoCapitalize}
        autoCorrect={false}
        editable={editable}
        onSubmitEditing={onSubmitEditing}
        returnKeyType={returnKeyType}
        style={[styles.input, inputStyle]}
        {...rest}
      />
      <TouchableOpacity
        style={styles.eyeButton}
        onPress={() => setShowPassword((prev) => !prev)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {showPassword ? (
          <EyeOff size={20} color={colors.textSecondary} />
        ) : (
          <Eye size={20} color={colors.textSecondary} />
        )}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (colors) =>
  StyleSheet.create({
    container: {
      position: 'relative',
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg || colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 16,
      minHeight: 52,
    },
    input: {
      flex: 1,
      paddingVertical: 13,
      paddingLeft: 16,
      paddingRight: 48,
      fontSize: 15,
      color: colors.text,
    },
    eyeButton: {
      position: 'absolute',
      right: 4,
      top: 4,
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
