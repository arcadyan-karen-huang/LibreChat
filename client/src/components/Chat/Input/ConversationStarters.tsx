import { useMemo, useCallback } from 'react';
import { EModelEndpoint, Constants } from 'librechat-data-provider';
import { useChatContext, useChatFormContext, useAgentsMapContext, useAssistantsMapContext } from '~/Providers';
import { useGetAssistantDocsQuery, useGetEndpointsQuery } from '~/data-provider';
import { getIconEndpoint, getEntity } from '~/utils';
import { useSubmitMessage } from '~/hooks';

const ConversationStarters = () => {
  const { conversation } = useChatContext();
  const agentsMap = useAgentsMapContext();
  const assistantMap = useAssistantsMapContext();
  const { data: endpointsConfig } = useGetEndpointsQuery();

  const endpointType = useMemo(() => {
    let ep = conversation?.endpoint ?? '';
    if (ep === EModelEndpoint.azureOpenAI) {
      ep = EModelEndpoint.openAI;
    }
    return getIconEndpoint({
      endpointsConfig,
      iconURL: conversation?.iconURL,
      endpoint: ep,
    });
  }, [conversation?.endpoint, conversation?.iconURL, endpointsConfig]);

  const { data: documentsMap = new Map() } = useGetAssistantDocsQuery(endpointType, {
    select: (data) => new Map(data.map((dbA) => [dbA.assistant_id, dbA])),
  });

  const { entity, isAgent } = getEntity({
    endpoint: endpointType,
    agentsMap,
    assistantMap,
    agent_id: conversation?.agent_id,
    assistant_id: conversation?.assistant_id,
  });

  const conversation_starters = useMemo(() => {
    if (entity?.conversation_starters?.length) {
      return entity.conversation_starters;
    }

    if (isAgent) {
      return [];
    }

    return documentsMap.get(entity?.id ?? '')?.conversation_starters ?? [];
  }, [documentsMap, isAgent, entity]);

  const methods = useChatFormContext();
  const sendConversationStarter = useCallback(
    (text: string) => methods.setValue('text', text),
    [methods],
  );

  if (!conversation_starters.length) {
    return null;
  }

  return (
    <div className="mt-8 flex flex-wrap justify-center gap-3 px-4">
      {conversation_starters
        .slice(0, Constants.MAX_CONVO_STARTERS)
        .map((text: string, index: number) => (
          <button
            key={index}
            onClick={() => sendConversationStarter(text)}
            className="group relative flex items-center text-start transition disabled:cursor-not-allowed xl:text-[14px] sm:border-token-border-default sm:enabled:hover:bg-surface-tertiary h-[50px] w-full gap-[15px] px-[15px] sm:h-[40px] sm:w-auto sm:max-w-none sm:gap-2 sm:rounded-[100px] sm:border sm:py-[10px] sm:ps-[14px] sm:pe-[16px]"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span className="text-token-text-primary min-w-0 overflow-hidden font-normal text-ellipsis whitespace-nowrap transition select-none sm:group-hover:text-token-text-primary sm:text-token-text-secondary">
                {text}
              </span>
            </span>
          </button>
        ))}
    </div>
  );
};

export default ConversationStarters;
