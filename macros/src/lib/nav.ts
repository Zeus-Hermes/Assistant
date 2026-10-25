import { router } from 'expo-router';

/** Close every modal in the add-food flow and land on the food log. */
export function finishLogging() {
  if (router.canDismiss()) router.dismissAll();
  router.navigate('/log');
}
