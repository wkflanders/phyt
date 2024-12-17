import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AlertTriangle, CheckCircle, Info, X, XCircle } from "lucide-react-native";

interface AlertProps {
    variant?: 'default' | 'destructive' | 'success' | 'info';
    title?: string;
    description?: string;
    icon?: boolean;
    onClose?: () => void;
    className?: string;
}

export function Alert({
    variant = 'default',
    title,
    description,
    icon = true,
    onClose,
    className = ''
}: AlertProps) {
    const getVariantStyles = () => {
        switch (variant) {
            case 'destructive':
                return 'bg-destructive/15 border-destructive/50';
            case 'success':
                return 'bg-emerald-500/15 border-emerald-500/50';
            case 'info':
                return 'bg-blue-500/15 border-blue-500/50';
            default:
                return 'bg-background border-input';
        }
    };

    const getIconColor = () => {
        switch (variant) {
            case 'destructive':
                return '#ef4444'; // text-destructive
            case 'success':
                return '#10b981'; // text-emerald-500
            case 'info':
                return '#3b82f6'; // text-blue-500
            default:
                return '#ffffff'; // text-foreground
        }
    };

    const getIcon = () => {
        switch (variant) {
            case 'destructive':
                return <XCircle size={20} color={getIconColor()} />;
            case 'success':
                return <CheckCircle size={20} color={getIconColor()} />;
            case 'info':
                return <Info size={20} color={getIconColor()} />;
            default:
                return <AlertTriangle size={20} color={getIconColor()} />;
        }
    };

    const getTextColor = () => {
        switch (variant) {
            case 'destructive':
                return 'text-destructive';
            case 'success':
                return 'text-emerald-500';
            case 'info':
                return 'text-blue-500';
            default:
                return 'text-foreground';
        }
    };

    return (
        <View className={`relative w-full rounded-lg border p-4 ${getVariantStyles()} ${className}`}>
            <View className="flex-row items-start gap-4">
                {icon && (
                    <View className="mt-1">
                        {getIcon()}
                    </View>
                )}
                <View className="flex-1">
                    {title && (
                        <Text className={`font-medium leading-none tracking-tight ${getTextColor()}`}>
                            {title}
                        </Text>
                    )}
                    {description && (
                        <Text className={`mt-1 text-sm ${getTextColor()} opacity-90`}>
                            {description}
                        </Text>
                    )}
                </View>
                {onClose && (
                    <TouchableOpacity
                        onPress={onClose}
                        className="ml-2"
                    >
                        <X size={20} color={getIconColor()} />
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );
}

export function AlertTitle({ children, className = '', style, ...props }: any) {
    return (
        <Text
            className={`font-medium leading-none tracking-tight ${className}`}
            style={style}
            {...props}
        >
            {children}
        </Text>
    );
}

export function AlertDescription({ children, className = '', style, ...props }: any) {
    return (
        <Text
            className={`mt-1 text-sm text-muted-foreground ${className}`}
            style={style}
            {...props}
        >
            {children}
        </Text>
    );
}