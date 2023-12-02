export const generateDateTotalId = (target?: Date) => {
    const currDate = target || new Date();
    const month = currDate.getMonth() + 1;
    const date = currDate.getDate();
    const year = currDate.getFullYear();

    return `total:${month}/${date}/${year}`;
};
