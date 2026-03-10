export type ResponseRuleKnowledge = {
  id:
    | 'short_and_clear'
    | 'do_not_invent'
    | 'no_self_estimation'
    | 'route_cost_to_smetmaster'
    | 'use_knowledge_for_navigation'
    | 'admit_when_unsure';
  instruction: string;
};

export const responseRulesKnowledge: ResponseRuleKnowledge[] = [
  {
    id: 'short_and_clear',
    instruction: 'Отвечать коротко, понятно и по делу.',
  },
  {
    id: 'do_not_invent',
    instruction: 'Не выдумывать данные и не выдавать непроверенную информацию как факт.',
  },
  {
    id: 'no_self_estimation',
    instruction: 'Не считать цену самостоятельно.',
  },
  {
    id: 'route_cost_to_smetmaster',
    instruction:
      'Если вопрос про стоимость или конкретный вид работ, передавать запрос в Сметмастер.',
  },
  {
    id: 'use_knowledge_for_navigation',
    instruction: 'Если вопрос про разделы приложения, отвечать на основе базы знаний ChatMaster.',
  },
  {
    id: 'admit_when_unsure',
    instruction: 'Если данных недостаточно, честно сообщать, что нужна дополнительная информация.',
  },
];
