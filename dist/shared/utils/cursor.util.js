"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeCursor = encodeCursor;
exports.decodeCursor = decodeCursor;
exports.buildCursorQuery = buildCursorQuery;
exports.buildCompoundCursorQuery = buildCompoundCursorQuery;
exports.getNextCursor = getNextCursor;
exports.processPaginatedResults = processPaginatedResults;
function encodeCursor(data) {
    const jsonString = JSON.stringify(data);
    return Buffer.from(jsonString).toString('base64');
}
function decodeCursor(cursor) {
    try {
        const jsonString = Buffer.from(cursor, 'base64').toString('utf-8');
        return JSON.parse(jsonString);
    }
    catch (error) {
        throw new Error('Invalid cursor format');
    }
}
function buildCursorQuery(cursor, field, direction = -1) {
    if (!cursor)
        return {};
    const decoded = decodeCursor(cursor);
    const value = decoded[field];
    if (direction === -1) {
        return { [field]: { $lt: value } };
    }
    else {
        return { [field]: { $gt: value } };
    }
}
function buildCompoundCursorQuery(cursor, fields, directions) {
    if (!cursor)
        return {};
    const decoded = decodeCursor(cursor);
    const query = { $or: [] };
    for (let i = 0; i < fields.length; i++) {
        const field = fields[i];
        const direction = directions[i];
        const value = decoded[field];
        const condition = {};
        for (let j = 0; j < i; j++) {
            condition[fields[j]] = decoded[fields[j]];
        }
        if (direction === -1) {
            condition[field] = { $lt: value };
        }
        else {
            condition[field] = { $gt: value };
        }
        query.$or.push(condition);
    }
    return query;
}
function getNextCursor(results, limit, fields = ['createdAt']) {
    if (results.length <= limit)
        return null;
    const lastItem = results[results.length - 1];
    const cursorData = {};
    fields.forEach(field => {
        cursorData[field] = lastItem[field];
    });
    return encodeCursor(cursorData);
}
function processPaginatedResults(results, limit, cursorFields = ['createdAt']) {
    const hasMore = results.length > limit;
    const data = hasMore ? results.slice(0, limit) : results;
    return {
        data,
        pagination: {
            nextCursor: hasMore && data.length > 0
                ? encodeCursor(cursorFields.reduce((acc, field) => {
                    acc[field] = data[data.length - 1][field];
                    return acc;
                }, {}))
                : null,
            hasMore,
        },
    };
}
//# sourceMappingURL=cursor.util.js.map