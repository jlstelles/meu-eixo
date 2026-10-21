// Cartões de mobilidade leve e mindfulness. Instruções curtas e gerais; não são prescrição.

export const CARE_NOTE =
  'Faça só o que estiver confortável e adapte ou pule o que não servir para você. Pare se sentir dor, tontura ou formigamento. Se houver lesão, limitação ou sintomas que persistem, converse com um profissional de saúde.';

export const MOBILITY_CARDS = [
  {
    id: 'mob-pescoco',
    kind: 'mobility',
    title: 'Pescoço suave',
    minutes: 1,
    steps: ['Sente-se com a coluna alta e os ombros soltos.', 'Incline devagar a orelha em direção ao ombro, sem forçar, por cerca de 20 segundos.', 'Volte ao centro e repita do outro lado, respirando normalmente.'],
  },
  {
    id: 'mob-ombros',
    kind: 'mobility',
    title: 'Ombros soltos',
    minutes: 1,
    steps: ['Com os braços relaxados, faça círculos lentos com os ombros para trás, umas 8 vezes.', 'Depois faça o mesmo para a frente.', 'Solte os ombros e respire fundo.'],
  },
  {
    id: 'mob-punhos',
    kind: 'mobility',
    title: 'Punhos e mãos',
    minutes: 1,
    steps: ['Estenda um braço à frente com a palma para cima.', 'Com a outra mão, puxe os dedos suavemente para baixo por 15 a 20 segundos.', 'Troque de lado e termine girando os punhos devagar.'],
  },
  {
    id: 'mob-coluna',
    kind: 'mobility',
    title: 'Coluna sentado',
    minutes: 2,
    steps: ['Sentado, apoie as mãos nos joelhos.', 'Arredonde as costas devagar e depois estenda o peito à frente, umas 8 vezes, no ritmo da respiração.', 'Termine sentado alto e solte o ar.'],
  },
  {
    id: 'mob-panturrilha',
    kind: 'mobility',
    title: 'Panturrilha em pé',
    minutes: 2,
    steps: ['Fique em pé de frente para uma parede ou mesa, com uma mão de apoio.', 'Dê um passo para trás e mantenha o calcanhar no chão, inclinando levemente o corpo à frente por 20 a 30 segundos.', 'Troque a perna.'],
  },
  {
    id: 'mob-caminhar',
    kind: 'mobility',
    title: 'Levantar e andar um pouco',
    minutes: 3,
    steps: ['Levante-se e ande pelo ambiente, ou suba e desça alguns degraus se for confortável.', 'Beba um pouco de água.', 'Volte quando estiver pronto.'],
  },
];

export const MINDFULNESS_CARDS = [
  {
    id: 'mind-respiracao',
    kind: 'mindfulness',
    title: 'Respiração atenta',
    minutes: 1,
    steps: ['Sente-se confortavelmente e, se quiser, feche os olhos ou suavize o olhar.', 'Observe o ar entrando e saindo, sem tentar mudar nada.', 'Quando a mente divagar, volte à respiração sem se criticar.'],
  },
  {
    id: 'mind-ritmo',
    kind: 'mindfulness',
    title: 'Respiração em ritmo calmo',
    minutes: 2,
    steps: ['Inspire pelo nariz contando até 4.', 'Solte o ar devagar contando até 6.', 'Repita umas 8 vezes. Se sentir tontura, volte a respirar normalmente.'],
  },
  {
    id: 'mind-sentidos',
    kind: 'mindfulness',
    title: 'Cinco sentidos',
    minutes: 2,
    steps: ['Perceba 5 coisas que você vê.', 'Perceba 4 que você sente ao toque e 3 sons.', 'Perceba 2 cheiros e 1 gosto. Termine com uma respiração profunda.'],
  },
  {
    id: 'mind-corpo',
    kind: 'mindfulness',
    title: 'Percorrer o corpo',
    minutes: 3,
    steps: ['Leve a atenção aos pés e vá subindo devagar: pernas, quadril, barriga, peito, braços, rosto.', 'Em cada parte, apenas note como está, sem julgar.', 'Termine abrindo os olhos e se espreguiçando, se quiser.'],
  },
];
