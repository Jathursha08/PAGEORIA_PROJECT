import { Alert } from 'react-native';

export function confirmDelete({ title, message, confirmLabel = 'Delete', onConfirm }) {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}
