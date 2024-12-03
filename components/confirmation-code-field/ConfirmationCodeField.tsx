/*

Concept: https://dribbble.com/shots/5476562-Forgot-Password-Verification/attachments

*/
import { Animated, Image, SafeAreaView, Text, View } from 'react-native';
import React, { useState } from 'react';

import {
  CodeField,
  Cursor,
  useBlurOnFulfill,
  useClearByFocusCell,
  RenderCellOptions,
} from 'react-native-confirmation-code-field';

import styles, {
  ACTIVE_CELL_BG_COLOR,
  CELL_BORDER_RADIUS,
  CELL_SIZE,
  DEFAULT_CELL_BG_COLOR,
  NOT_EMPTY_CELL_BG_COLOR,
  ACTIVE_CELL_BORDER_COLOR,
} from './confirmationCodeFieldStyles';
import { FunctionalButton } from '../FunctionalButton';

interface ConfirmationCodeFieldProps {
  containerStyles?: string;
};

interface AnimateCellProps {
  hasValue: boolean;
  index: number;
  isFocused: boolean;
}

const { Value, Text: AnimatedText } = Animated;

const CELL_COUNT = 6;

const animationsColor = [...new Array(CELL_COUNT)].map(() => new Value(0));
const animationsScale = [...new Array(CELL_COUNT)].map(() => new Value(1));
const animateCell = ({ hasValue, index, isFocused }: AnimateCellProps) => {
  Animated.parallel([
    Animated.timing(animationsColor[index], {
      useNativeDriver: false,
      toValue: isFocused ? 1 : 0,
      duration: 250,
    }),
    Animated.spring(animationsScale[index], {
      useNativeDriver: false,
      toValue: hasValue ? 0 : 1,
    }),
  ]).start();
};

export const ConfirmationCodeField = ({ onCodeComplete }: { onCodeComplete: (code: string) => void; }) => {
  const [value, setValue] = useState('');
  const ref = useBlurOnFulfill({ value, cellCount: CELL_COUNT });
  const [props, getCellOnLayoutHandler] = useClearByFocusCell({
    value,
    setValue,
  });

  const handleVerify = () => {
    if (value.length === CELL_COUNT) {
      onCodeComplete(value);
    }
  };

  const renderCell = ({ index, symbol, isFocused }: RenderCellOptions) => {
    const hasValue = Boolean(symbol);
    const animatedCellStyle = {
      backgroundColor: hasValue
        ? animationsScale[index].interpolate({
          inputRange: [0, 1],
          outputRange: [NOT_EMPTY_CELL_BG_COLOR, ACTIVE_CELL_BG_COLOR],
        })
        : animationsColor[index].interpolate({
          inputRange: [0, 1],
          outputRange: [DEFAULT_CELL_BG_COLOR, ACTIVE_CELL_BG_COLOR],
        }),
      borderRadius: animationsScale[index].interpolate({
        inputRange: [0, 1],
        outputRange: [CELL_SIZE, CELL_BORDER_RADIUS],
      }),
      transform: [
        {
          scale: animationsScale[index].interpolate({
            inputRange: [0, 1],
            outputRange: [0.2, 1],
          }),
        },
      ],
      borderColor: isFocused
        ? animationsColor[index].interpolate({
          inputRange: [0, 1],
          outputRange: [DEFAULT_CELL_BG_COLOR, ACTIVE_CELL_BORDER_COLOR],
        })
        : DEFAULT_CELL_BG_COLOR,
      borderWidth: isFocused ? 2 : 1,
    };

    // Run animation on next event loop tik
    // Because we need first return new style prop and then animate this value
    setTimeout(() => {
      animateCell({ hasValue, index, isFocused });
    }, 0);

    return (
      <AnimatedText
        key={index}
        style={[
          animatedCellStyle,
          {
            height: 50,
            width: 50,
            marginHorizontal: 8,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            textAlign: 'center',
            lineHeight: 40,
            fontSize: 24,
            color: 'white',
          }
        ]}
        onLayout={getCellOnLayoutHandler(index)}>
        {symbol || (isFocused ? <Cursor /> : null)}
      </AnimatedText>
    );
  };

  return (
    <SafeAreaView className="bg-black items-center">
      <Text className="text-white text-3xl font-intersemibold">Verify your email</Text>
      <Text className="text-phyt_text_secondary mt-2 font-intersemibold text-xl">
        Please enter the verification code we emailed {'\n'}
        you to continue (check your spam folder too)
      </Text>
      <CodeField
        ref={ref}
        {...props}
        value={value}
        onChangeText={setValue}
        cellCount={CELL_COUNT}
        rootStyle={styles.codeFieldRoot}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        renderCell={renderCell}
      />
      <FunctionalButton
        title={'Verify'}
        handlePress={handleVerify}
        containerStyles="mt-20 w-full py-4 rounded-xl"
        textStyles="font-intersemibold"
        isLoading={false}
      />
    </SafeAreaView>
  );
};