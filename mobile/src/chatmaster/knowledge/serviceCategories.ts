export type ServiceCategoryKnowledge = {
  id:
    | 'electrician'
    | 'plumbing'
    | 'welder'
    | 'handyman'
    | 'cleaning'
    | 'finishing'
    | 'general_construction';
  title: string;
  shortDescription: string;
};

export const serviceCategoriesKnowledge: ServiceCategoryKnowledge[] = [
  {
    id: 'electrician',
    title: 'Электрика',
    shortDescription: 'Работы по электрике, розеткам, свету и кабелю.',
  },
  {
    id: 'plumbing',
    title: 'Сантехника',
    shortDescription: 'Работы по трубам, воде, смесителям и сантехническим узлам.',
  },
  {
    id: 'welder',
    title: 'Сварочные работы',
    shortDescription: 'Сварка металлоконструкций, швов и ремонт металлических элементов.',
  },
  {
    id: 'handyman',
    title: 'Мастер на час',
    shortDescription: 'Небольшие бытовые работы по дому и мелкий ремонт.',
  },
  {
    id: 'cleaning',
    title: 'Уборка',
    shortDescription: 'Поддерживающая, генеральная и послестроительная уборка помещений.',
  },
  {
    id: 'finishing',
    title: 'Отделочные работы',
    shortDescription: 'Покраска, шпаклевка, укладка покрытий и другие отделочные задачи.',
  },
  {
    id: 'general_construction',
    title: 'Общестроительные работы',
    shortDescription: 'Базовые строительные и ремонтные работы общего профиля.',
  },
];
