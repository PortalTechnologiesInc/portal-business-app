import OnboardingContainer from './context/OnboardingContainer';
import Step1 from './screens/onboarding/Step1';
import Step2 from './screens/onboarding/Step2';

export default function Onboarding() {
  return (
    <OnboardingContainer>
      <Step1 />
      <Step2 />
    </OnboardingContainer>
  );
}