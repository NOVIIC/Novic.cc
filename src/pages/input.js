import React, { useState } from 'react';
const InputButton = () => {
 const [inputUrl, setInputUrl] = useState('');

 const handleSubmit = (event) => {
   event.preventDefault();
   window.location.href = inputUrl;
 };

 return (
   <form onSubmit={handleSubmit}>
     <input
       type="text"
       placeholder="请输入网址"
       value={inputUrl}
       onChange={(event) => setInputUrl(event.target.value)}
     />
     <button type="submit">确定</button>
   </form>
 );
};

export default InputButton;