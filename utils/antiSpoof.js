function antiSpoofCheck(imageBuffer) {
    const size = imageBuffer.length;

    if (size < 40000) {
        return { spoof: true, reason: "Image too small (possible spoof)" };
    }

    if (size > 5 * 1024 * 1024) {
        return { spoof: true, reason: "Image too large (suspicious)" };
    }

    return { spoof: false };
}

module.exports = antiSpoofCheck;