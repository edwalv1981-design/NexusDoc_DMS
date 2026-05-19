import routing from '../../../lib/formWizardRouting.cjs';

export const {
  normalizeFormTypeLabel,
  resolveCanonicalFormType,
  usesSchemaWizard,
  usesFondosWizard,
  usesDedicatedKyciForm,
  usesDedicatedKyceForm,
  isKyciFormType,
  isKyceFormType,
} = routing;

export default routing;
