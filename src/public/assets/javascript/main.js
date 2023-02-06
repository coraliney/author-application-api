const url = "http://localhost:5000/graphql";

const graphQlQuery = async (url, query, variables = {}) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const res = await response.json();
  return res.data;
};

document.getElementById("btn").addEventListener("click", async () => {
  const getAllDogs = `query GetAllDogs {
    getAllDogs {
      description
      id
      name
    }
  }`;
  let data = await graphQlQuery(url, getAllDogs);
  //console.log(data);
  createHtml(data.getAllDogs);
});
const createHtml = (data) => {
  const container = document.body;

  data.forEach((val) => {
    const dogContainer = document.createElement("div");
    const topic = document.createElement("h2");
    const desc = document.createElement("p");
    topic.innerHTML = val.name;
    desc.innerHTML = val.description;
    dogContainer.addEventListener("click", () => {
      handleClick(val.id);
    });
    container.appendChild(dogContainer);
    dogContainer.appendChild(topic);
    dogContainer.appendChild(desc);
  });
};
document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const createDogQuery = `mutation CreateDog($name: String!, $description: String) {
        createDog(name: $name, description: $description) {
            id
            name
            description
 }
    }`;
  const input = {
    name: document.getElementById("textOne").value,
    description: document.getElementById("textTwo").value,
  };
  const response = await graphQlQuery(url, createDogQuery, input);
  console.log(response);
});

const handleClick = (arg) => {
  console.log("you clicked " + arg);
};
