import React, { Component } from 'react';
import './App.css';
import Header from './Components/Header';
import Favicon from 'react-favicon';
import DayView from './Components/DayView';
import appFavicon from './resources/favicon.png';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Favicon url={appFavicon} />
        <Header />
        <DayView />
      </div>
    );
  }
}

export default App;