const express = require('express');
const axios = require('axios');
const fs = require('fs');
const app = express();

const clientId = "iF4mphCVM4shveVY4yT4QPgpDsbktlAy";
const clientSecret = "DnycrrmfitZKZKdu";
let token = "";
const product_details=["PTH08T240FAS", "PTH03060YAS"];

async function LoginUser(){
    try {
        const formData = new URLSearchParams();
        formData.append("client_id", clientId);
        formData.append("client_secret", clientSecret);
        formData.append("grant_type", "client_credentials");

        const response = await axios.post('https://api.digikey.com/v1/oauth2/token', formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (!response.data.access_token) {
            throw new Error('Failed to fetch access token');
        }
        
        token = response.data.access_token;

        product_details.forEach((productId, index) => {
            setTimeout(() => {
                fetchProductData(token, productId);
            },  index * 4000);
        });

    } catch (error) {
        console.error('Error:', error);
    }
}

function extractAndSortCategories(category, result = []) {
    result.push({ Name: category.Name, id: category.ParentId });

    category.ChildCategories.forEach(childCategory => {
        extractAndSortCategories(childCategory, result);
    });

    result.sort((a, b) => a.id - b.id);

    return result;
}


async function fetchProductData(token, productId)
{
    try {
        if (!token) {
            throw new Error('Access token is missing or invalid');
        }
        const response = await axios.get(`https://api.digikey.com/products/v4/search/${productId}/productdetails`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-DIGIKEY-Client-Id': clientId
            }
        });

        console.log(response.data);
        const pd = response.data;
        
        let ParameterString = "<table>";
        pd?.Product.Parameters.forEach(element => {
            ParameterString += `<tr><th>${element.ParameterText}</th><td>${element.ValueText}</td></tr>`;
        });
        ParameterString += "</table>"

        let ClassificationString = "<table>";
        Object.entries(pd.Product.Classifications).forEach(([key, value]) => {
            ClassificationString += `<tr><th>${key}</th><td>${value}</td></tr>`;
        });
        
        ClassificationString += "</table>";

        let CategoryString = "";
        const sortedCategories = extractAndSortCategories(pd.Product.Category);
        console.log(sortedCategories);
        sortedCategories.forEach((category)=>{
            CategoryString += `${category.Name}<`;
        })

        const str = `INSERT INTO ProductDetails(Description, DetailedDescription, ManufacturerName, 
            ManufacturerProductNumber, DatasheetUrl, PhotoUrl, UnitPrice, Parameters, Category, Classifications)
            values('${pd?.Product?.Description.ProductDescription}','${pd?.Product?.Description.DetailedDescription}',
            '${pd?.Product?.Manufacturer?.Name}','${pd?.Product?.ManufacturerProductNumber}','${pd?.Product?.DatasheetUrl}',
            '${pd?.Product?.PhotoUrl}',${pd?.Product?.ProductVariations[0]?.StandardPricing[0]?.UnitPrice},'${ParameterString}',
            '${CategoryString}','${ClassificationString}'        
        )\n`;

        fs.appendFile("./Query.txt", str, (err) => {
            if (err) {
                console.error('Error appending to file:', err);
                res.send(err);
            }
            console.log('Data appended to file successfully!');
        });
    } catch (error) {
        console.error('Error:', error);
    }
}

LoginUser();