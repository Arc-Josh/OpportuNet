
export const storeToken =(token)=>{
    localStorage.setItem("access_token",token)
}

export const getToken = () => {
    return localStorage.getItem('access_token')
  };
  
export const expireToken = () =>{
    localStorage.removeItem('access_token')
}