import { StyleSheet, Platform } from 'react-native';

export const CELL_SIZE = 50;
export const CELL_BORDER_RADIUS = 8;
export const DEFAULT_CELL_BG_COLOR = '#2E2E5D';
export const NOT_EMPTY_CELL_BG_COLOR = '#777798';
export const ACTIVE_CELL_BG_COLOR = '#48004C';
export const ACTIVE_CELL_BORDER_COLOR = '#FE26FE';

const confirmationCodeFieldStyles = StyleSheet.create({
    codeFieldRoot: {
        height: CELL_SIZE,
        marginTop: 30,
        justifyContent: 'center',
    },
    cell: {
        marginHorizontal: 4,
        height: CELL_SIZE,
        width: CELL_SIZE,
        lineHeight: CELL_SIZE - 5,
        ...Platform.select({ web: { lineHeight: 65 } }),
        fontSize: 30,
        textAlign: 'center',
        borderRadius: CELL_BORDER_RADIUS,
        color: '#000',
        backgroundColor: '#000',

        // IOS
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.22,
        shadowRadius: 2.22,

        // Android
        elevation: 3,
    },
});

export default confirmationCodeFieldStyles;