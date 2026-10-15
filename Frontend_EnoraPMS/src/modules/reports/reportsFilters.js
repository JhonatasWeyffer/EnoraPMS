export function applyFilters(events, filters){
  return events.filter(e=>{
    if(filters.modules.length && !filters.modules.includes(e.module))
      return false;

    if(filters.type && e.type !== filters.type)
      return false;

    if(filters.search &&
      !e.message.toLowerCase().includes(filters.search.toLowerCase()))
      return false;

    return true;
  });
}