export const OPEN_KNOWLEDGE_EVENT = 'open-knowledge-base';

export const dispatchOpenKnowledgeEvent = () => {
  window.dispatchEvent(new CustomEvent(OPEN_KNOWLEDGE_EVENT));
};
