export type SlideImageSource = string;

export type OnboardingSlide =
  | {
      kind: 'polaroid';
      title: string;
      titleHighlight?: string;
      description: string;
      heroImage: SlideImageSource;
    }
  | {
      kind: 'bento';
      title: string;
      description: string;
      mainImage: SlideImageSource;
      adventureImage: SlideImageSource;
      spaThumb: SlideImageSource;
      travelThumb: SlideImageSource;
    }
  | {
      kind: 'scrapbook';
      title: string;
      description: string;
      heroImage: SlideImageSource;
      peekImage: SlideImageSource;
      memoryDate: string;
      memoryQuote: string;
    }
  | {
      kind: 'progress';
      title: string;
      description: string;
      completed: number;
      total: number;
      doneCardImage: SlideImageSource;
    }
  | {
      kind: 'partners';
      title: string;
      description: string;
    };

export const ONBOARDING_SLIDES: OnboardingSlide[] = [
  {
    kind: 'polaroid',
    title: '100 citas ',
    titleHighlight: 'antes de casarse',
    description: 'Empezad a vivir las 100 citas juntos.',
    heroImage: '/images/onboarding/default.webp',
  },
  {
    kind: 'bento',
    title: 'Descubrid nuevas experiencias juntos',
    description: 'Explorad citas románticas, aventuras, escapadas y planes especiales.',
    mainImage: '/images/onboarding/food.webp',
    adventureImage: '/images/onboarding/landscape.webp',
    spaThumb: '/images/onboarding/spa.webp',
    travelThumb: '/images/onboarding/plane.webp',
  },
  {
    kind: 'scrapbook',
    title: 'Convertid cada cita en un recuerdo',
    description: 'Guardad fotos, fechas y pequeños momentos para construir vuestra historia.',
    heroImage: '/images/onboarding/river.webp',
    peekImage: '/images/onboarding/golf.webp',
    memoryDate: '11 de Septiembre, 2022',
    memoryQuote: '"De cuando fuimos a Benidorm a ver Mundomar y a Aqualandia. Que recuerdos! 💕"',
  },
  {
    kind: 'progress',
    title: 'Vivid vuestra historia paso a paso',
    description: 'Completad las 100 citas y cread recuerdos únicos antes del gran día.',
    completed: 24,
    total: 100,
    doneCardImage: '/images/onboarding/beach.webp',
  },
  {
    kind: 'partners',
    title: 'Inicia sesión',
    description: 'Conecta tu cuenta y comienza a vivir las 100 citas juntos.',
  },
];
