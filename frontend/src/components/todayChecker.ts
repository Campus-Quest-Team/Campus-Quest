function isToday(dateString: string): boolean {
  const today = new Date();
  const postDate = new Date(dateString);
  return (
    postDate.getFullYear() === today.getFullYear() &&
    postDate.getMonth() === today.getMonth() &&
    postDate.getDate() === today.getDate()
  );
}
export default isToday;