export const getRecentData = (data) => {
    data.sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
    });

    return data.slice(0, 5);
};
