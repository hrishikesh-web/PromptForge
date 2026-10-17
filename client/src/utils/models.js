/**
 * The ai_models row on a prompt is shown as "Suggested model": the model or kind
 * of model the author recommends. It is NOT a claim that the prompt was tested on it.
 * Rows such as "Any chat model" use the provider value "Model-agnostic".
 */
export const AGNOSTIC_PROVIDER = 'Model-agnostic';

export const modelLabel = (item) => {
  if (!item) return '';
  const name = item.model_name || '';
  const provider = item.provider || '';
  if (!provider || provider === AGNOSTIC_PROVIDER || name.toLowerCase().includes(provider.toLowerCase())) return name;
  return `${name} (${provider})`;
};
