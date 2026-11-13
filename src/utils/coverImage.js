import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { t } from '../i18n';

// Lets the reader choose a cover from the device library. The picture is resized and stored
// as a small data-URI inside SQLite, so it survives cache clears and works fully offline.
export async function pickCoverImage() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error(t('Photo library permission is needed to choose a cover.'));
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [2, 3],
    quality: 0.8,
  });
  if (result.canceled || !result.assets?.length) return null;

  const context = ImageManipulator.manipulate(result.assets[0].uri);
  context.resize({ width: 420 });
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!saved.base64) throw new Error(t('Could not read the selected image.'));
  return `data:image/jpeg;base64,${saved.base64}`;
}
