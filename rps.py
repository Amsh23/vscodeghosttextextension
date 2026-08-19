"""Play rock-paper-scissors with MediaPipe hand gesture detection."""

import argparse
import random
import time
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision

CHOICES = ("ROCK", "PAPER", "SCISSORS")
WINNING_MATCHUPS = {
    ("ROCK", "SCISSORS"),
    ("PAPER", "ROCK"),
    ("SCISSORS", "PAPER"),
}


def create_landmarker(model_path):
    options = vision.HandLandmarkerOptions(
        base_options=python.BaseOptions(model_asset_path=str(model_path)),
        num_hands=1,
    )
    return vision.HandLandmarker.create_from_options(options)


def parse_camera_source(value):
    return int(value) if value.isdigit() else value


def detect_hands(landmarker, frame):
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    return landmarker.detect(image)


def classify_gesture(hand_landmarks):
    wrist_y = hand_landmarks[0].y
    fingertips_up = [hand_landmarks[index].y < wrist_y for index in (8, 12, 16, 20)]

    if all(fingertips_up):
        return "PAPER"
    if fingertips_up[0] and fingertips_up[1]:
        return "SCISSORS"
    return "ROCK"


def decide_winner(player_choice, computer_choice):
    if player_choice == computer_choice:
        return "DRAW"
    if (player_choice, computer_choice) in WINNING_MATCHUPS:
        return "WIN!"
    return "LOSE"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--camera", default="0", help="Camera index or trusted stream URL.")
    parser.add_argument("--model", default="hand_landmarker.task", help="MediaPipe model path.")
    parser.add_argument("--cooldown", type=float, default=2.0, help="Seconds between rounds.")
    args = parser.parse_args()

    model_path = Path(args.model)
    if not model_path.exists():
        raise FileNotFoundError(f"MediaPipe model not found: {model_path}")

    capture = cv2.VideoCapture(parse_camera_source(args.camera))
    if not capture.isOpened():
        raise RuntimeError(f"Unable to open camera source: {args.camera}")

    last_round_at = 0.0
    with create_landmarker(model_path) as landmarker:
        try:
            while True:
                ok, frame = capture.read()
                if not ok:
                    break

                result = detect_hands(landmarker, frame)
                for hand_landmarks in result.hand_landmarks:
                    player_choice = classify_gesture(hand_landmarks)
                    if time.time() - last_round_at < args.cooldown:
                        continue

                    computer_choice = random.choice(CHOICES)
                    outcome = decide_winner(player_choice, computer_choice)
                    last_round_at = time.time()
                    print(player_choice, computer_choice, outcome)

                cv2.imshow("RPS", frame)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
        finally:
            capture.release()
            cv2.destroyAllWindows()


if __name__ == "__main__":
    main()
