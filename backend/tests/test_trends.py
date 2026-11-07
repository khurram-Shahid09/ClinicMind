from datetime import date

from app.services.trends import find_trend, mann_kendall_z


def pts(values, start_year=2023):
    return [(date(start_year + i // 2, 4 if i % 2 == 0 else 10, 1), v, i + 1) for i, v in enumerate(values)]


def test_slow_fall_in_hemoglobin_is_found():
    t = find_trend("hb", pts([14.2, 13.8, 13.3, 12.9, 12.4, 11.9]))
    assert t and t["direction"] == "down" and t["count"] == 6
    assert "14.2" in t["summary"] and "11.9" in t["summary"]


def test_stable_values_are_not_flagged():
    assert find_trend("hb", pts([13.9, 14.1, 13.8, 14.0, 13.9, 14.1])) is None


def test_too_few_values_are_not_flagged():
    assert find_trend("hb", pts([14.2, 13.0, 11.9])) is None


def test_values_too_close_in_time_are_not_flagged():
    points = [(date(2026, 1, d), v, d) for d, v in zip((1, 5, 10, 15, 20), (14.2, 13.8, 13.3, 12.9, 11.9))]
    assert find_trend("hb", points) is None


def test_change_in_the_better_direction_is_not_flagged():
    assert find_trend("hba1c", pts([8.6, 8.2, 7.9, 7.5, 7.2, 7.0])) is None


def test_small_change_is_not_flagged():
    assert find_trend("creatinine", pts([1.1, 1.1, 1.1, 1.2, 1.2, 1.3])) is None


def test_mann_kendall_all_equal_is_zero():
    assert mann_kendall_z([5, 5, 5, 5]) == 0
