let images = [];

class QueueSystem {
  private queue: any[];
  private port: any;

  constructor() {
    this.queue = [];
    this.port = null;

    this.setupConnection();
  }

  setupConnection() {
    this.port = chrome.runtime.connect({ name: "content" });
  }

  public addToQueue(item: any) {
    this.queue.push(item);
  }

  public removeFromQueue(item: any) {
    this.queue = this.queue.filter((queueItem) => queueItem !== item);
  }

  public getQueue() {
    return this.queue;
  }

  async sendMessage(message: any) {
    //Get the queue's first item, and send it to the background script, then wait for response, once we gotten something, delete it from queue and continue.
    this.port.postMessage(message);

    return new Promise((resolve, reject) => {
      this.port.onMessage.addListener((message: any) => {
        if (message) {
          //this.removeFromQueue(this.queue[0]);
          resolve(message);
        } else {
          reject("Error");
        }
      });
    });
  }
}

const queueSystem = new QueueSystem();

class TabController {
  private selectedTab: string;

  constructor() {
    this.selectedTab = "home";

    this.checkLogin();
  }

  public checkLogin = async () => {
    const idLogged = await isLoggedIn();
    if (idLogged === false) {
      this.selectedTab = "login";
      document.querySelectorAll(".tab-content").forEach((tabContent) => {
        if (tabContent.id === "login" + "-content") {
          tabContent.classList.remove("hidden");
        } else {
          tabContent.classList.add("hidden");
        }
      });
    } else {
      document.querySelectorAll(".tab-content").forEach((tabContent) => {
        if (tabContent.id === this.selectedTab + "-content") {
          tabContent.classList.remove("hidden");
        } else {
          tabContent.classList.add("hidden");
        }
      });
    }
  };

  public getSelectedTab() {
    return this.selectedTab;
  }

  public setSelectedTab(tab: string) {
    this.selectedTab = tab;

    document.querySelectorAll(".tab-content").forEach((tabContent) => {
      if (tabContent.id === tab + "-content") {
        tabContent.classList.remove("hidden");
      } else {
        tabContent.classList.add("hidden");
      }
    });
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  const tabController = new TabController();
  const login = async (username: string, password: string) => {
    try {
      const response: any = await queueSystem.sendMessage({
        message: "login",
        username,
        password,
      });

      console.log("Response received", response);

      if (response.response.jwt) {
        tabController.setSelectedTab("home");
      }
    } catch (error) {
      console.error("Error sending or receiving a message:", error);
    }
  };

  const register = async (
    username: string,
    password: string,
    email: string
  ) => {
    try {
      const response: any = await queueSystem.sendMessage({
        message: "register",
        username,
        password,
        email,
      });

      console.log("Response received", response);
      if (response.jwt) {
        tabController.setSelectedTab("home");
      }
    } catch (error) {
      console.error("Error sending or receiving a message:", error);
    }
  };

  document.querySelectorAll(".tab").forEach((tab) => {
    console.log("Tab found");
    tab.addEventListener("click", () => {
      console.log("Tab clicked");
      document.querySelectorAll(".tab").forEach((tab) => {
        tab.classList.remove("active");
      });
      tab.classList.add("active");

      tabController.setSelectedTab(tab.id);
      console.log(tabController.getSelectedTab());
    });
  });

  try {
    const response: any = await queueSystem.sendMessage({
      message: "getImages",
    });

    console.log("Response received", response);
    addContentToList(response?.images);
  } catch (error) {
    console.error("Error sending or receiving a message:", error);
  }

  document.getElementById("login-button").addEventListener("click", () => {
    const username = (<HTMLInputElement>(
      document.getElementById("login_username")
    )).value;
    const password = (<HTMLInputElement>(
      document.getElementById("login_password")
    )).value;

    login(username, password);
  });

  document.getElementById("register-button").addEventListener("click", () => {
    const username = (<HTMLInputElement>(
      document.getElementById("register_username")
    )).value;
    const password = (<HTMLInputElement>(
      document.getElementById("register_password")
    )).value;
    const email = (<HTMLInputElement>document.getElementById("register_email"))
      .value;

    register(username, password, email);
  });

  isLoggedIn().then((data) => {
    console.log(data);
    if (data === true) {
      document.getElementById(
        "signed-in"
      ).innerHTML = `<button class="tab" id="logout">
      Logout
      <i class="fa-solid fa-sign-out"></i>
      </button>`;
    } else {
      document.getElementById(
        "signed-in"
      ).innerHTML = `<button class="tab" id="login">
      Login
      <i class="fa-solid fa-sign-in"></i>
      </button>`;
    }
  });
});

const addContentToList = (images: []) => {
  const main = document.getElementById("list");

  images.forEach((image) => {
    const item = document.createElement("item");
    const itemDiv = document.createElement("div");
    itemDiv.classList.add("item");

    const imageElement = document.createElement("img");
    imageElement.src = image;

    const footerItems = document.createElement("div");
    footerItems.classList.add("item-footer");

    const addButton = document.createElement("button");
    addButton.classList.add("button");
    addButton.innerText = "Add";

    const downloadButton = document.createElement("button");
    downloadButton.classList.add("button");
    downloadButton.innerText = "Download";

    footerItems.appendChild(addButton);
    footerItems.appendChild(downloadButton);

    itemDiv.appendChild(imageElement);
    itemDiv.appendChild(footerItems);

    item.appendChild(itemDiv);
    main.appendChild(item);
  });
};

const isLoggedIn = async () => {
  try {
    const response: any = await queueSystem.sendMessage({
      message: "isLoggedIn",
    });

    console.log("Response received", response);
    return response.response;
  } catch (error) {
    console.error("Error sending or receiving a message:", error);
  }
};

const uploadImages = async (images) => {
  try {
    const response: any = await queueSystem.sendMessage({
      message: "uploadImages",
      images,
    });

    console.log("Response received", response);
  } catch (error) {
    console.error("Error sending or receiving a message:", error);
  }
};

document.getElementById("imageInput").addEventListener("change", (e) => {
  sendImage(e.target as HTMLInputElement);
});

function sendImage(input: HTMLInputElement) {
  const selectedImage = document.getElementById(
    "selectedImage"
  ) as HTMLImageElement;
  if (input.files && input.files[0]) {
    const reader = new FileReader();

    reader.onload = function (e) {
      selectedImage.src = e.target.result as string;
      selectedImage.style.display = "block";
    };

    reader.readAsDataURL(input.files[0]);
  }
}