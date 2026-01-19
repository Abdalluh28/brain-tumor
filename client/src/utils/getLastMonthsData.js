export function getLastMonthsData(data, months = 4) {
    const now = new Date("2024-12-31");
    const past = new Date("2024-12-31");
    past.setMonth(now.getMonth() - months);

    return data.filter((item) => {
        const itemDate = new Date(item.date);
        return itemDate >= past && itemDate <= now;
    });
}
