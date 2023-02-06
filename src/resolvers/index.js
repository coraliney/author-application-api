const path = require("path");
const fsPromises = require("fs/promises");
const {
  fileExists,
  readJsonFile,
  deleteFile,
  getDirectoryFileNames,
} = require("../utils/fileHandling");
const { GraphQLError, printType, isNonNullType } = require("graphql");
const crypto = require("crypto");
const axios = require("axios").default;
const productDirectory = path.join(__dirname, "..", "data", "projects");
const cartDirectory = path.join(__dirname, "..", "data", "carts");

exports.resolvers = {
  Query: {
    getProductById: async (_, args) => {
      const projectId = args.productId;
      const productFilePath = path.join(productDirectory, `${projectId}.json`);
      const projectExists = await fileExists(productFilePath);
      if (!projectExists) {
        return new GraphQLError("That project does not exist");
      }
      const productData = await fsPromises.readFile(productFilePath, {
        encoding: "utf-8",
      });
      const data = JSON.parse(productData);
      return data;
    },
    getAllProducts: async (_, args) => {
      const products = await getDirectoryFileNames(productDirectory);
      const productData = [];
      for (const file of products) {
        const filePath = path.join(productDirectory, file);
        const fileContents = await fsPromises.readFile(filePath, {
          encoding: "utf-8",
        });
        const data = JSON.parse(fileContents);
        productData.push(data);
      }

      return productData;
    },
    getShoppingCart: async (_, args) => {
      const cartId = args.shoppingCartId;
      const productFilePath = path.join(cartDirectory, `${cartId}.json`);
      const productExists = await fileExists(productFilePath);
      if (!productExists) {
        return new GraphQLError("That project does not exist");
      }
      const productData = await fsPromises.readFile(productFilePath, {
        encoding: "utf-8",
      });
      const data = JSON.parse(productData);
      return data;
    },
  },
  Mutation: {
    createProduct: async (_, args) => {
      if (args.name.length === 0)
        return new GraphQLError("Name must be at least 1 character long");
      const newProduct = {
        id: crypto.randomUUID(),
        name: args.name,
        price: args.price,
        description: args.description || "",
        image: args.image,
      };
      let filePath = path.join(productDirectory, `${newProduct.id}.json`);
      let idExists = true;
      while (idExists) {
        const exists = await fileExists(filePath);
        console.log(exists, newProduct.id);
        if (exists) {
          newProduct.id = crypto.randomUUID();
          filePath = path.join(productDirectory, `${newProduct.id}.json`);
        }
        idExists = exists;
      }
      await fsPromises.writeFile(filePath, JSON.stringify(newProduct));
      return newProduct;
    },
    createCart: async (_, args) => {
      const newCart = {
        id: crypto.randomUUID(),
        total: args.input.total || 0,
        products: [],
      };
      let filePath = path.join(cartDirectory, `${newCart.id}.json`);
      let idExists = true;
      while (idExists) {
        const exists = await fileExists(filePath);
        console.log(exists, newCart.id);
        if (exists) {
          newCart.id = crypto.randomUUID();
          filePath = path.join(cartDirectory, `${newCart.id}.json`);
        }
        idExists = exists;
      }
      await fsPromises.writeFile(filePath, JSON.stringify(newCart));
      return newCart;
    },
    updateProduct: async (_, args) => {
      const { id, name, description, price, image } = args.input;
      const filePath = path.join(productDirectory, `${id}.json`);
      const productExists = await fileExists(filePath);
      if (!productExists) {
        return new GraphQLError("That product does not exist");
      }
      const updatedProduct = {
        id,
        name,
        description,
        price,
        image,
      };
      await fsPromises.writeFile(filePath, JSON.stringify(updatedProduct));
      return updatedProduct;
    },
    addToCart: async (_, args) => {
      const prodId = args.productId;
      const cartId = args.cartId;
      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);
      const productFilePath = path.join(productDirectory, `${prodId}.json`);
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) {
        return new GraphQLError("That cart does not exist");
      }
      const productExists = await fileExists(productFilePath);
      if (!productExists) {
        return new GraphQLError("That project does not exist");
      }
      const productData = JSON.parse(
        await fsPromises.readFile(productFilePath, { encoding: "utf-8" })
      );
      let cartData = JSON.parse(
        await fsPromises.readFile(cartFilePath, { encoding: "utf-8" })
      );

      const newProduct = {
        id: productData.id,
        name: productData.name,
        description: productData.description,
        price: productData.price,
        image: productData.image,
      };
      cartData.products.push(newProduct);
      cartData.total = 0;
      for (let i = 0; i < cartData.products.length; i++) {
        cartData.total += cartData.products[i].price;
      }
      await fsPromises.writeFile(cartFilePath, JSON.stringify(cartData));
      return cartData;
    },
    removeFromCart: async (_, args) => {
      const prodId = args.productId;
      const cartId = args.cartId;
      const cartFilePath = path.join(cartDirectory, `${cartId}.json`);
      const productFilePath = path.join(productDirectory, `${prodId}.json`);
      const cartExists = await fileExists(cartFilePath);
      if (!cartExists) return new GraphQLError("That cart does not exist");
      const productExists = await fileExists(productFilePath);
      if (!productExists) {
        return new GraphQLError("The product does not exist");
      }
      /* 		const productData = JSON.parse(
		  await fsPromises.readFile(productFilePath, { encoding: "utf-8" })
		); */
      let cartData = JSON.parse(
        await fsPromises.readFile(cartFilePath, { encoding: "utf-8" })
      );
      success = false;
      for (let i = 0; i < cartData.products.length; i++) {
        if (prodId === cartData.products[i].id && success === false) {
          cartData.products.splice([i], 1);
          success = true;
        }
      }
      cartData.total = 0;
      for (let i = 0; i < cartData.products.length; i++) {
        cartData.total += cartData.products[i].price;
      }
      await fsPromises.writeFile(cartFilePath, JSON.stringify(cartData));
      if (success) {
        return { deletedId: prodId, cartData, success };
      }

      return { success, deletedId: prodId };
    },
    deleteProduct: async (_, args) => {
      const productId = args.productId;
      const filePath = path.join(productDirectory, `${productId}.json`);
      const productExists = await fileExists(filePath);
      if (!productExists) {
        return new GraphQLError("That project does not exist");
      }
      try {
        await deleteFile(filePath);
      } catch (error) {
        return {
          deletedId: productId,
          success: false,
        };
      }
      return {
        deletedId: productId,
        success: true,
      };
    },
    deleteCart: async (_, args) => {
      const cartId = args.cartId;
      const filePath = path.join(cartDirectory, `${cartId}.json`);
      const cartExists = await fileExists(filePath);
      if (!cartExists) {
        return new GraphQLError("That cart does not exist");
      }
      try {
        await deleteFile(filePath);
      } catch (error) {
        return {
          deletedId: cartId,
          success: false,
        };
      }
      return {
        deletedId: cartId,
        success: true,
      };
    },
  },
};
