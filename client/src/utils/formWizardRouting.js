import routing from '../../../lib/formWizardRouting.cjs';

export const {
  normalizeFormTypeLabel,
  resolveCanonicalFormType,
  usesSchemaWizard,
  usesFondosWizard,
  usesDedicatedKyciForm,
  isKyciFormType,
} = routing;

export default routing;
