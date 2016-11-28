Ext.define('CustomApp', {
  extend: 'Rally.app.App',
  stateful: true,
  componentCls: 'app',
  userStoryID: 59421248389,
  userStoryName: '',
  startDate: undefined,
  endDate: undefined,
  userStoryComboBox: null,
  startDateChooser: null,
  endDateChooser: null,
  burnChart: null,
  launch: function() {
    Ext.define('My.BurnCalculator', {
      extend: 'Rally.data.lookback.calculator.TimeSeriesCalculator',
      config: {
        completedScheduleStateNames: ['Accepted']
      },
      constructor: function(config) {
        this.initConfig(config);
        this.callParent(arguments);
      },

      getDerivedFieldsOnInput: function() {
        var completedScheduleStateNames = this.getCompletedScheduleStateNames();
        return [
          {
            "as": "Planned",
            "f": function(snapshot) {
              if (snapshot.PlanEstimate) {
                return snapshot.PlanEstimate;
              }
              return 0;
            }
          },
          {
            "as": "PlannedCompleted",
            "f": function(snapshot) {
              if (_.contains(completedScheduleStateNames, snapshot.ScheduleState) && snapshot.PlanEstimate) {
                return snapshot.PlanEstimate;
              }
              return 0;
            }
          }
        ];
      },
      getMetrics: function() {
        return [
          {
            "field": "Planned",
            "as": "Planned",
            "display": "line",
            "f": "sum"
          },
          {
            "field": "PlannedCompleted",
            "as": "Completed",
            "f": "sum",
            "display": "column"
          }
        ];
      }
    });

    this.userStoryComboBox = this.add({
      xtype: 'rallyartifactsearchcombobox',
      stateful: true,
      stateId: this.getContext().getScopedStateId('userStory'),
      fieldLabel: "User Story",
      storeConfig: {
        models: ['userstory']
      },
      listeners: {
        select: this._onUserStoryComboboxChanged,
        scope: this
      },
      labelWidth: 75
    });

    this.startDateChooser = this.add({
      xtype: 'datefield',
      stateful: true,
      stateId: this.getContext().getScopedStateId('startDate'),
      fieldLabel: 'Start Date',
      itemId: 'start_date_chooser',
      labelWidth: 75,
      listeners: {
        change: this._onStartDateChanged,
        scope: this
      }
    });

    this.endDateChooser = this.add({
      xtype: 'datefield',
      stateful: true,
      stateId: this.getContext().getScopedStateId('endDate'),
      fieldLabel: 'End Date',
      itemId:'end_date_chooser',
      labelWidth: 75,
      listeners: {
        change: this._onEndDateChanged,
        scope: this
      }
    });

    this.burnChart = this.add({
      xtype: 'rallychart',
      storeType: 'Rally.data.lookback.SnapshotStore',
      storeConfig: this._getStoreConfig(),
      calculatorType: 'My.BurnCalculator',
      calculatorConfig: {
        startDate: this.startDate,
        endData: this.endDate,
        completedScheduleStateNames: ['Accepted', 'Released'] },
      chartConfig: this._getChartConfig(),
    });
  },

  _getStoreConfig: function() {
    return {
      find: {
        _ItemHierarchy: this.userStoryID,
        _TypeHierarchy: 'HierarchicalRequirement',
        Children: null
      },
      fetch: ['ScheduleState', 'PlanEstimate'],
      hydrate: ['ScheduleState'],
      sort: {
        _ValidFrom: 1
      },
      context: this.getContext().getDataContext(),
      limit: Infinity
    };
  },
  /**
  * Generate a valid Highcharts configuration object to specify the chart
  */
  _getChartConfig: function() {
    return {
      chart: {
        defaultSeriesType: 'area',
        zoomType: 'xy'
      },
      title: {
        text: 'Burnup of ' + this.userStoryName
      },
      xAxis: {
        categories: [],
        tickmarkPlacement: 'on',
        tickInterval: 5,
        title: {
          text: 'Date',
          margin: 10
        }
      },
      yAxis: [
        {
          title: {
            text: 'Points'
          }
        }
      ],
      tooltip: {
        formatter: function() {
          return '' + this.x + '<br />' + this.series.name + ': ' + this.y;
        }
      },
      plotOptions: {
        series: {
          marker: {
            enabled: false,
            states: {
              hover: {
                enabled: true
              }
            }
          },
          groupPadding: 0.01
        },
        column: {
          stacking: null,
          shadow: false
        }
      }
    };
  },

  _onUserStoryComboboxChanged: function(combo,records) {
    var record = records[0];
    //console.log('Record: ', record);
    var newUserStoryID = record.get('ObjectID');
    if (this.userStoryID !== newUserStoryID) {
      // New user story - reset date ranges
      this.userStoryID = newUserStoryID;
      this.startDate = undefined;
      this.startDateChooser.reset();
      this.endDate = undefined;
      this.endDateChooser.reset();
    }
    this.userStoryName = record.get('FormattedID') + ': ' + record.get('Name');
    this.saveState();
    if (!this.burnChart) return;
    var newConfig = {
      storeConfig: this._getStoreConfig(),
      chartConfig: this._getChartConfig(),
      calculatorConfig: {
        startDate: this.startDate,
        endDate: this.endDate
      }
    };
    this.burnChart.refresh(newConfig);
  },

  _onStartDateChanged: function(field,newValue) {
    this.startDate = newValue;
    this.saveState();
    if (!this.burnChart) return;
    var newConfig = {
      calculatorConfig: {
        startDate: this.startDate,
        endDate: this.endDate
      }
    };
    this.burnChart.refresh(newConfig);
  },

  _onEndDateChanged: function(field,newValue) {
    this.endDate = newValue;
    this.saveState();
    if (!this.burnChart) return;
    var newConfig = {
      calculatorConfig: {
        startDate: this.startDate,
        endDate: this.endDate
      }
    };
    this.burnChart.refresh(newConfig);
  },

  getState: function() {
    return {
      userStoryID: this.userStoryID,
      userStoryName: this.userStoryName,
      startDate: this.startDate,
      endDate: this.endDate
    };
  }
});
