import SparkMD5 from 'spark-md5';

/**
 * Generate MD5 hash of a video file
 * @param {File} file - The video file to hash
 * @returns {Promise<string>} - A promise that resolves to the MD5 hash
 */
export function generateVideoMD5(file) {
  return new Promise((resolve, reject) => {
    const chunkSize = 2097152; // Read in chunks of 2MB
    const spark = new SparkMD5.ArrayBuffer();
    const fileReader = new FileReader();

    let currentChunk = 0;
    const chunks = Math.ceil(file.size / chunkSize);

    fileReader.onload = (e) => {
      spark.append(e.target.result); // Append array buffer
      currentChunk++;

      if (currentChunk < chunks) {
        loadNext();
      } else {
        const md5Hash = spark.end();
        resolve(md5Hash);
      }
    };

    fileReader.onerror = (error) => {
      reject(error);
    };

    function loadNext() {
      const start = currentChunk * chunkSize;
      const end = ((start + chunkSize) >= file.size) ? file.size : start + chunkSize;
      fileReader.readAsArrayBuffer(file.slice(start, end));
    }

    loadNext();
  });
}

export function has_inference(id, inferences) {
    const found_inference = inferences.find(inference => inference.id === id);
    return found_inference !== undefined;
}

export function get_inference_by_id(id, inferences) {
    const found_inference = inferences.find(inference => inference.id === id);

    if (!found_inference) {
        return {
            wpm_timestamps: [],
            wpm_data: []
        }
    }

    return found_inference.data;
}