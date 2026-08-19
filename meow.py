"""Display MediaPipe hand landmarks from a camera stream."""

import argparse
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (17, 18), (18, 19), (19, 20),
    (0, 17),
]


def create_landmarker(model_path):
    options = vision.HandLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=str(model_path)),
        num_hands=2,
    )
    return vision.HandLandmarker.create_from_options(options)


def parse_camera_source(value):
    return int(value) if value.isdigit() else value


def detect_hands(landmarker, frame):
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    return landmarker.detect(image)


def draw_landmarks(frame, hand_landmarks):
    height, width = frame.shape[:2]
    for start, end in HAND_CONNECTIONS:
        start_point = hand_landmarks[start]
        end_point = hand_landmarks[end]
        cv2.line(
            frame,
            (int(start_point.x * width), int(start_point.y * height)),
            (int(end_point.x * width), int(end_point.y * height)),
            (0, 20, 255),
            3,
        )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--camera", default="0", help="Camera index or trusted stream URL.")
    parser.add_argument("--model", default="hand_landmarker.task", help="MediaPipe model path.")
    args = parser.parse_args()

    model_path = Path(args.model)
    if not model_path.exists():
        raise FileNotFoundError(f"MediaPipe model not found: {model_path}")

    capture = cv2.VideoCapture(parse_camera_source(args.camera))
    if not capture.isOpened():
        raise RuntimeError(f"Unable to open camera source: {args.camera}")

    with create_landmarker(model_path) as landmarker:
        try:
            while True:
                ok, frame = capture.read()
                if not ok:
                    break

                result = detect_hands(landmarker, frame)
                for hand_landmarks in result.hand_landmarks:
                    draw_landmarks(frame, hand_landmarks)

                cv2.imshow("HAND", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
        finally:
            capture.release()
            cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
