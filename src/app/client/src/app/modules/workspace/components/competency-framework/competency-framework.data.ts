// Replicated from skill-map.data.ts, update as needed for competency framework
export const COMPETENCY_FRAMEWORK_DATA = {
  filterType: 'competencyframework',
  inPageredirectUrl: '/workspace/content/competencyframework',
  pageLimit: 10,
  sortingOptions: [
    { label: 'Last Updated', value: 'lastUpdatedOn' },
    { label: 'Name', value: 'name' },
    { label: 'Status', value: 'status' }
  ],
  messages: {
    noResult: 'No competency frameworks found',
    error: 'Something went wrong, try again later',
    loader: 'Loading competency frameworks...'
  }
};
