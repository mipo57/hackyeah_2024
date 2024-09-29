import base64
from typing import List, Literal


from speech_grade.pipeline.types import Event
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser, StrOutputParser
from pathlib import Path


from pydantic import BaseModel, Field


class FrameProblems(BaseModel):
    problems_list: List[
        Literal[
            "another_person_in_frame",
            "wrong_posture",
            "facial_expressions",
        ]
    ] = Field(..., description="List of quality problems with the video.")


class_names = {
    "another_person_in_frame": "Inny człowiek na tle",
    "wrong_posture": "Zła postawa / gestykulacja",
    "facial_expressions": "Nietypowy wyraz twarzy",
}

class_descriptions = {
    "another_person_in_frame": "Wykryto, że na nagranie zostało zaburzone przez osobę trzecią. Może to znacznie zmniejszyć profesjonalizm nagrania i spowodować, że odbiorca się rozkojarzy.",
    "wrong_posture": "Wykryto, że osoba mówiąca ma niekorzystną posturę ciała lub gestykulację. Może to znacznie zmniejszyć profesjonalizm nagrania i spowodować, że odbiorca się rozkojarzy.",
    "facial_expressions": "Wykryto, że osoba mówiąca ma niepokojące, agresywne lub bardzo nietypowe wyrazy twarzy. Może to znacznie zmniejszyć profesjonalizm nagrania i spowodować, że odbiorca się rozkojarzy.",
}


def classify_image(image_path: str) -> List[Event]:
    """
    Classify images in a folder into one of three classes using OpenAI's API, running in parallel.

    :param folder_path: Path to the folder containing images
    :return: List of dictionaries containing image names and their classifications
    """
    # Define the three classes
    classes = "\n".join(
        [
            "another_person_in_frame -> Another, potentialy unwanted person in the frame.",
            "wrong_posture -> Speaker is not looking at the camera, turning away, making movements, argresive gesticulation.",
            "facial_expressions -> Speaker is makeing wierd or agresive factial expresions.",
        ]
    )

    frame_name = Path(image_path).stem

    frame_start, frame_end = frame_name.split("_")

    frame_start_s = int(frame_start) / 1000
    frame_end_s = int(frame_end) / 1000

    model = ChatOpenAI(model="gpt-4o-mini", max_retries=3, max_tokens=1024)

    parser = PydanticOutputParser(pydantic_object=FrameProblems)

    prompt = ChatPromptTemplate.from_messages(
        [
            (
                "system",
                "Your task is to analyze the image provided by user and see if there are any quality problems of the following categories:\n{classes}\n\nIf you don't see any problems of the mentioned types, set problems to empty list.\n{output_format}",
            ),
            (
                "user",
                [
                    # {"type": "text", "text": "What problems are in this image?"},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{encode_image(image_path)}",
                            "detail": "high",
                        },
                    },
                ],
            ),
        ]
    )

    prompt.input_variables = []
    prompt.partial_variables = {
        "output_format": parser.get_format_instructions(),
        "classes": classes,
    }

    chain = prompt | model | StrOutputParser()  # | parser

    result = chain.invoke({}).strip()

    # Parsing hack as langchain seems to not work well with images
    if result.startswith("```json"):
        result = result[7:]

    if result.endswith("```"):
        result = result[:-3]

    import json

    result = json.loads(result)
    # result = parser.parse(result)

    events = []
    for problem in result.get("problems_list", []):
        events.append(
            Event(
                start_s=frame_start_s,
                end_s=frame_end_s,
                event=class_names[problem],
                description=class_descriptions[problem],
                color="#FFC107",
            )
        )

    return events

    # # Initialize OpenAI client
    # client = OpenAI()

    # # Get list of image files
    # image_files = [f for f in os.listdir(folder_path) if f.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.bmp'))]

    # def classify_image(filename):
    #     image_path = os.path.join(folder_path, filename)
    #     try:
    #         response = client.chat.completions.create(
    #             model="gpt-4o-mini",
    #             messages=[
    #                 {
    #                     "role": "system",
    #                     "content": f"Your task is to check whether there is one or more problems with the video of an official speaking. Here is a list of potential problems:\n{', '.join(classes)}\nReturn JSON list of problems you found by id (eg. [1,2]). If there are no problems, return empty list ([])."
    #                 },
    #                 {
    #                     "role": "user",
    #                     "content": [
    #                         {
    #                             "type": "image_url",
    #                             "image_url": {
    #                                 "url": f"data:image/jpeg;base64,{encode_image(image_path)}",
    #                                 "detail": "high"
    #                             },
    #                         },
    #                     ],
    #                 }
    #             ],
    #             max_tokens=50,
    #         )
    #         classification = response.choices[0].message.content.strip()
    #         return {"image": filename, "classification": classification}
    #     except Exception as e:
    #         return {"image": filename, "classification": f"Classification failed: {str(e)}"}

    # # Use ThreadPoolExecutor to run classifications in parallel
    # with concurrent.futures.ThreadPoolExecutor() as executor:
    #     results = list(executor.map(classify_image, image_files))

    # return results


def encode_image(image_path):
    """Encode the image to base64."""

    with open(image_path, "rb") as image_file:
        return base64.b64encode(image_file.read()).decode("utf-8")
