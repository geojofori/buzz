import { RecoveryScreen } from "./RecoveryScreen";

export function RelaunchRequiredScreen() {
  return (
    <RecoveryScreen
      testId="relaunch-required"
      title="Restart Whisper Work to finish recovery"
      body="Your identity was updated. Whisper Work needs to restart so syncing and agents run under it."
    />
  );
}
