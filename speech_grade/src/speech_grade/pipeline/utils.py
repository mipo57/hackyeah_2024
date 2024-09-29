from collections import defaultdict
from speech_grade.pipeline.types import Event
from typing import List


def combine_overlapping_events(events: List[Event]) -> List[Event]:
    events_per_type = defaultdict(list)
    for event in events:
        events_per_type[event["event"]].append(event)

    combined_events = []
    for event_type, events in events_per_type.items():
        events = sorted(events, key=lambda x: x["start_s"])

        current_event = events[0]
        for event in events[1:]:
            if event["start_s"] - current_event["end_s"] < 0.5:
                current_event["end_s"] = max(current_event["end_s"], event["end_s"])
            else:
                combined_events.append(current_event)
                current_event = event
        combined_events.append(current_event)

    return combined_events


def filter_out_short_events(events: List[Event], min_duration: float) -> List[Event]:
    return [
        event for event in events if event["end_s"] - event["start_s"] > min_duration
    ]
