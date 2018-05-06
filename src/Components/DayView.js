import React, { Component } from 'react';
import update from 'immutability-helper';
import DaySelect from './DaySelect';
import Calotron from './Calotron';
import MealGroup from './MealGroup';
import ActivityInput from './ActivityInput';
import NetCalories from './NetCalories';
import MacroTotals from './MacroTotals';

class DayView extends Component {

  constructor(props) {
    super(props);
    this.state = {
      selectedDay: new Date(),
      meals: {
        breakfast: {
          items: []
        },
        lunch: {
          items: []
        },
        dinner: {
          items: []
        },
        snacks: {
          items: []
        }
      },
      caloriesBurned: undefined,
      loadingItems: true,
      removingItem: false
    }
  }

  componentDidMount() {
    document.title = 'EasyCal';
    this.getConsumptions();
  }

  getConsumptions() {
    let date = this.state.selectedDay.toISOString().split('T')[0];
    fetch('/api/consumptions?type=day&userId=1&date=' + date)
      .then((resp) => resp.json())
      .then(meals => {
        this.setState({
          meals: meals,
          loadingItems: false
        });
      });
  }

  changeSelectedDay(newDay) {
    this.setState({selectedDay: newDay}, () => this.getConsumptions());
  }

  removeItem(consumptionId) {
    this.setState({removingItem: true});
    fetch('/api/consumptions/' + consumptionId, {method: 'DELETE'})
      .then(res => {
        if(res.ok) {
          let mealItemIndex, meal;
          for(var mealName in this.state.meals) {
            this.state.meals[mealName].items.forEach(item => {
              if(item.consumptionId === consumptionId) {
                mealItemIndex = this.state.meals[mealName].items.indexOf(item);
                meal = mealName;
              }
            });
            // if already found the meal item, don't need to keep searching
            if(mealItemIndex !== undefined) break
          }
          let newState = update(this.state, {
            meals: {
              [meal]: {
                items: {$splice: [[mealItemIndex, 1]]}
              }
            }
          });
          this.setState(newState);
        } else {
          alert('This item couldn\'t be removed :(');
        }
        this.setState({removingItem: false});
      });
  }

  /**
   * Calculates totals for each meal being displayed
  */
  calculateMealTotals() {
    let newMealTotals = [];
    for(var mealName in this.state.meals) {
      let totalCals, totalCarbs, totalFat, totalProtein;
      totalCals = totalCarbs = totalFat = totalProtein = 0;
      let meal = this.state.meals[mealName];
      meal.items.forEach(item => {
        let servingSizeMultiplier = item.selectedServing.quantity * item.selectedServing.servingSize.ratio;

        totalCals += Math.round(item.calories * servingSizeMultiplier);
        totalCarbs += Math.round(item.carbs * servingSizeMultiplier);
        totalFat += Math.round(item.fat * servingSizeMultiplier);
        totalProtein += Math.round(item.protein * servingSizeMultiplier);
      });
      newMealTotals.push({
        calories: totalCals,
        carbs: totalCarbs,
        fat: totalFat,
        protein: totalProtein
      });
    }
    return newMealTotals;
  }

  calculateDayTotals(mealTotals) {
    // calculate consumption totals (nutrients & calories)
    let caloriesEaten, carbs, fat, protein;
    caloriesEaten = carbs = fat = protein = 0;
    mealTotals.forEach(mealTotal => {
      caloriesEaten += mealTotal.calories;
      carbs += mealTotal.carbs;
      fat += mealTotal.fat;
      protein += mealTotal.protein;
    });

    // calculate net calories (consumption - activity)
    let netCalories = caloriesEaten - (this.state.caloriesBurned ? this.state.caloriesBurned : 0);
    return {
      caloriesEaten: caloriesEaten,
      netCalories: netCalories,
      carbs: carbs,
      fat: fat,
      protein: protein
    }
  }

  /**
   * Merge changed MealGroup states with DayView state,
   * send PUT request to backend
  */
  handleServingUpdate(newItemsList, mealType) {
    let updatedConsumption;
    // determine consumption for which serving was updated
    this.state.meals[mealType].items.forEach(item => {
      let correspondingNewItem = newItemsList.items[this.state.meals[mealType].items.indexOf(item)];
      if(item.selectedServing.servingSize.id !== correspondingNewItem.selectedServing.servingSize.id
          || item.selectedServing.quantity !== correspondingNewItem.selectedServing.quantity) {
        updatedConsumption = correspondingNewItem;
      }
    });
    fetch('/api/consumptions/' + updatedConsumption.consumptionId, {
      method: 'PUT',
      body: JSON.stringify(updatedConsumption)
    })
      .then(res => {
        if(res.ok) {
          let newState = update(this.state, {
            meals: {
              [mealType]: {$set: newItemsList}
            }
          });
          this.setState(newState);
        } else {
          alert('There was a problem updating this serving size.');
        }
      })
  }

  handleActivityChanged(calories) {
    let caloriesInt = Number(calories);
    this.setState({caloriesBurned: caloriesInt});
  }

  render() {
    let mealTotals = this.calculateMealTotals();
    let dayTotals = this.calculateDayTotals(mealTotals);

    return (
      <div className="DayView content-container">
        <DaySelect 
          selectedDay={this.state.selectedDay}
          changeSelectedDay={this.changeSelectedDay.bind(this)}
        />
        <Calotron 
          netCalories={dayTotals.netCalories}
          caloriesEaten={dayTotals.caloriesEaten}
          caloriesBurned={this.state.caloriesBurned}
          loading={this.state.loadingItems}
        />
        <div className="clearfix"></div>

        <MealGroup 
          type="Breakfast"
          items={this.state.meals.breakfast.items}
          handleServingUpdate={this.handleServingUpdate.bind(this)}
          handleItemRemove={this.removeItem.bind(this)}
          removingItem={this.state.removingItem}
        />
        <MealGroup 
          type="Lunch"
          items={this.state.meals.lunch.items}
          handleServingUpdate={this.handleServingUpdate.bind(this)}
          handleItemRemove={this.removeItem.bind(this)}
          removingItem={this.state.removingItem}
        />
        <MealGroup 
          type="Dinner"
          items={this.state.meals.dinner.items}
          handleServingUpdate={this.handleServingUpdate.bind(this)}
          handleItemRemove={this.removeItem.bind(this)}
          removingItem={this.state.removingItem}
        />
        <MealGroup 
          type="Snacks"
          items={this.state.meals.snacks.items}
          handleServingUpdate={this.handleServingUpdate.bind(this)}
          handleItemRemove={this.removeItem.bind(this)}
          removingItem={this.state.removingItem}
        />

        <ActivityInput
          caloriesBurned={this.state.caloriesBurned} 
          handleActivityChanged={this.handleActivityChanged.bind(this)}
        />
        <NetCalories
          caloriesEaten={dayTotals.caloriesEaten}
          caloriesBurned={this.state.caloriesBurned}
          netCalories={dayTotals.netCalories} 
        />
        <MacroTotals 
          totalCarbs={dayTotals.carbs}
          totalFat={dayTotals.fat}
          totalProtein={dayTotals.protein}
        />
      </div>
    );
  }
}

export default DayView;
