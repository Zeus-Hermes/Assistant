import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import { lookupBarcode } from '@/lib/foodApi';
import type { Food } from '@/lib/types';
import { useStore } from '@/store/useStore';
import { colors, radius, space } from '@/theme';

import { Button, Field, T } from './ui';

/** Barcode camera (phone only) plus a typed-barcode fallback. */
export function ScanPanel({ onFound }: { onFound: (food: Food) => void }) {
  const usdaApiKey = useStore((s) => s.usdaApiKey);
  const [permission, requestPermission] = useCameraPermissions();
  const [manual, setManual] = useState('');
  const [status, setStatus] = useState<'idle' | 'looking' | 'notfound' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const busy = useRef(false);

  const lookup = async (code: string) => {
    const barcode = code.replace(/\D/g, '');
    if (busy.current || barcode.length < 6) return;
    busy.current = true;
    setStatus('looking');
    try {
      const food = await lookupBarcode(barcode, { usdaApiKey });
      if (food) {
        setStatus('idle');
        onFound(food);
      } else {
        setStatus('notfound');
        setMessage(`No product found for ${barcode}. Try searching by name, or create it in Library.`);
      }
    } catch (e) {
      setStatus('error');
      setMessage((e as Error).message);
    }
    // Let the camera fire again after a short pause.
    setTimeout(() => (busy.current = false), 1500);
  };

  const onScanned = (r: BarcodeScanningResult) => lookup(r.data);
  const cameraAvailable = Platform.OS !== 'web';

  return (
    <View style={{ flex: 1 }}>
      {cameraAvailable && permission?.granted ? (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={status === 'looking' ? undefined : onScanned}
          />
          <View style={styles.reticle} pointerEvents="none" />
        </View>
      ) : cameraAvailable ? (
        <View style={[styles.cameraWrap, styles.center]}>
          <T dim style={{ textAlign: 'center' }}>
            Camera access is needed to scan barcodes.
          </T>
          <Button title="Allow camera" onPress={requestPermission} />
        </View>
      ) : null}

      <View style={styles.bottom}>
        {status === 'looking' && <ActivityIndicator color={colors.text} />}
        {(status === 'notfound' || status === 'error') && (
          <T style={{ color: status === 'error' ? colors.danger : colors.expenditure }} testID="scan-message">
            {message}
          </T>
        )}
        <Field
          testID="barcode-input"
          label="Type the barcode"
          value={manual}
          onChangeText={setManual}
          keyboardType="number-pad"
          placeholder="e.g. 049000028911"
          onSubmitEditing={() => lookup(manual)}
        />
        <Button
          testID="barcode-lookup"
          title="Look up"
          variant="secondary"
          onPress={() => lookup(manual)}
          disabled={status === 'looking'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cameraWrap: {
    flex: 1,
    minHeight: 260,
    margin: space.lg,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.lg, padding: space.xl },
  reticle: {
    position: 'absolute',
    left: '12%',
    right: '12%',
    top: '38%',
    height: '24%',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.8)',
    borderRadius: radius.md,
  },
  bottom: { padding: space.lg, gap: space.md },
});
