import re
import nltk

nltk.download("punkt", quiet=True)

# Constants
MIN_FOG = 10
MAX_FOG = 45
MIN_FLESH = 0
MAX_FLESH = 100


def normalize_score(score: float, min_score: float, max_score: float) -> float:
    normalized_score = (max_score - score) / (max_score - min_score)
    if normalized_score < 0:
        normalized_score = 0
    elif normalized_score > 1:
        normalized_score = 1

    return normalized_score


def count_syllables_polish(word):
    # Define Polish vowels, including nasal vowels and "y"
    polish_vowels = "aeiouyąęó"

    # List of common Polish diphthongs and combinations that form a single syllable
    diphthongs = [
        "au",
        "eu",
        "ia",
        "ie",
        "io",
        "iu",
        "ą",
        "ę",
        "ó",
        "ya",
        "ye",
        "yo",
        "yu",
    ]

    # Convert the word to lowercase to standardize the input
    word = word.lower()

    # This regex matches clusters of vowels in the word
    vowel_clusters = re.findall(f"[{polish_vowels}]+", word)

    syllable_count = 0

    # Variable to keep track of previously counted cluster to prevent double-counting
    previous_cluster = ""

    for cluster in vowel_clusters:
        # Check if the current cluster is a diphthong or a single vowel
        if cluster in diphthongs or len(cluster) == 1:
            syllable_count += 1
        else:
            # For clusters longer than one character, check each vowel separately
            for i in range(len(cluster)):
                # If it's a nasal vowel and next is not a vowel, count separately
                if cluster[i] in "ąę" and (
                    i + 1 < len(cluster) and cluster[i + 1] not in polish_vowels
                ):
                    syllable_count += 1
                elif cluster[i] not in "ąę":
                    syllable_count += 1

        previous_cluster = cluster

    return syllable_count


def gunning_fog(text: str) -> float:
    sentences = nltk.sent_tokenize(text)
    words = nltk.word_tokenize(text)
    num_sentences = len(sentences)
    num_words = len(words)

    # FOg for polish uses 3 syllables as a complex word not 2
    complex_words = sum(1 for word in words if count_syllables_polish(word) > 3)

    if num_words == 0 or num_sentences == 0:
        return 0

    print(num_words / num_sentences)
    print(100 * complex_words / num_words)

    return 0.4 * ((num_words / num_sentences) + 100 * (complex_words / num_words))


def clarity_score(text: str, num_events: int) -> float:
    fog_index = gunning_fog(text)

    return 100 * normalize_score(fog_index + num_events * 2, MIN_FOG, MAX_FOG)
