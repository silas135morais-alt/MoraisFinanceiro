export function getMonthRange(date = new Date()) {
  
  const startsAt = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  
  const endsAt = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 23, 59, 59, 999));
  
  return { startsAt, endsAt };
  
}



/**

 * Adds calendar months while clamping the day to the last valid day of the
 
 * destination month. This prevents Jan 31 + 1 month from becoming Mar 3.
 
 */

export function addMonths(date: Date, months: number) {
  
  const year = date.getUTCFullYear();
  
  const month = date.getUTCMonth() + months;
  
  const day = date.getUTCDate();
  
  const destinationLastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  

  
  return new Date(Date.UTC(year, month, Math.min(day, destinationLastDay), date.getUTCHours(), date.getUTCMinutes(), date.getUTCSeconds(), date.getUTCMilliseconds()));
  
}














