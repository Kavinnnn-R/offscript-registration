
const eventConfig = {
  brand: 'ELVORA EVENTS',
  eventName: 'ELVORA OFFSCRIPT',
  subtitle: 'A FARMSTAY SOCIAL MEET',
  tagline: 'Less scrolling. More living.',

  location: 'Senaro Luxury Farm, Sholayur, Palakkad, Kerala',
  venueLabel: 'Senaro Luxury Farm · Sholayur, near Anaikatti',
  dateLabel: 'SUNDAY, 25 OCTOBER 2026',
  timeLabel: 'Full-day experience',
  mapUrl:
  'https://www.google.com/maps/search/?api=1&query=Senaro+Luxury+Farm+Sholayur+Palakkad+Kerala',

  // Keep this equal to public.event_settings.ticket_price in Supabase.
  registrationAmount: 1500,
  currency: 'INR',

  maxPeoplePerRegistration: 4,
  minimumAge: 21,
  ageGroups: ['21–27', '28–34', '35–40'],

  submitToBackend: true,
  registrationEndpoint: '/api/registrations',

  mapUrl:
    'https://www.google.com/maps/search/?api=1&query=Senaro+Luxury+Farm+Sholayur+Palakkad+Kerala',

  activities: [
    {
      icon: '🏊',
      title: 'Poolside Escape',
      text: 'Unwind by the swimming pool.'
    },
    {
      icon: '🎱',
      title: 'Snooker & Games',
      text: 'Friendly competition, easy conversations.'
    },
    {
      icon: '🃏',
      title: 'Poker Sessions',
      text: 'Social game sessions, subject to venue rules.'
    },
    {
      icon: '🎯',
      title: 'Group Activities',
      text: 'Icebreakers, team games and shared laughs.'
    },
    {
      icon: '🍗',
      title: 'Lunch & Naatukozhi',
      text: 'A hearty meal together.'
    },
    {
      icon: '🤝',
      title: 'New Connections',
      text: 'Meet people beyond your usual circle.'
    }
  ],

  // Temporary reference images. Replace these with actual resort photos
  // when you provide them. These are not verified Senaro Luxury Farm photos.
  resortPhotos: [
  {
    title: 'The Senaro Experience',
    text: 'A private villa surrounded by tropical greenery.',
    url: '/images/resort/senaro-villa-exterior-evening.jpg'
  },
  {
    title: 'Poolside Escape',
    text: 'Relax and enjoy the swimming pool.',
    url: '/images/resort/senaro-swimming-pool.jpg'
  },
  {
    title: 'Villa & Pool',
    text: 'A closer look at the villa and poolside setting.',
    url: '/images/resort/senaro-pool-and-villa-aerial.jpg'
  },
  {
    title: 'Nature & Mountain Views',
    text: 'Green surroundings and a peaceful atmosphere.',
    url: '/images/resort/senaro-mountain-and-estate-view.jpg'
  },
  {
    title: 'Outdoor Dining',
    text: 'Enjoy relaxed moments in the garden.',
    url: '/images/resort/senaro-outdoor-dining-garden.jpg'
  },
  {
    title: 'Snooker & Games',
    text: 'Add some friendly competition to the experience.',
    url: '/images/resort/senaro-snooker-game-room.jpg'
  },
  {
    title: 'Villa Interiors',
    text: 'Comfortable indoor spaces for your stay.',
    url: '/images/resort/senaro-living-room-interior.jpg'
  },
  {
    title: 'Bedroom Suite',
    text: 'A look at the villa bedroom.',
    url: '/images/resort/senaro-bedroom-suite.jpg'
  },
  {
    title: 'Balcony Views',
    text: 'Take in the greenery from the balcony.',
    url: '/images/resort/senaro-balcony-and-palm-view.jpg'
  },
  {
    title: 'Dining Area',
    text: 'An inviting indoor dining space.',
    url: '/images/resort/senaro-kitchen-and-dining-area.jpg'
  },
  {
    title: 'Villa Exterior',
    text: 'The villa illuminated in the evening.',
    url: '/images/resort/senaro-villa-exterior-garden.jpg'
  },
  {
    title: 'Lounge Area',
    text: 'Relax in the villa living area.',
    url: '/images/resort/senaro-lounge-and-living-area.jpg'
  },
  {
    title: 'Bedroom Interior',
    text: 'A wider view of the bedroom interior.',
    url: '/images/resort/senaro-bedroom-interior-wide.jpg'
  },
  {
    title: 'Garden Breakfast',
    text: 'A garden setting for a relaxed meal.',
    url: '/images/resort/senaro-garden-breakfast-table.jpg'
  },
  {
    title: 'Bathroom',
    text: 'A look at the villa bathroom.',
    url: '/images/resort/senaro-bathroom.jpg'
  }
]
}
export default eventConfig
