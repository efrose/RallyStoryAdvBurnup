Ext.define('CustomApp', {
  extend: 'Rally.app.App',
  componentCls: 'app',
  userStoryID: 0,
  launch: function() {
    //Write app code here
    this.burnCalculator = Ext.define('Rally.example.BurnCalculator', {
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
      fieldLabel: "User Story",
      storeConfig: {
        models: ['userstory']
      },
      listeners: {
        ready: this._onUserStoryComboboxLoad,
        select: this._onUserStoryComboboxChanged,
        scope: this
      },
      labelWidth: 75
    });

    this.add({
      xtype: 'datefield',
      fieldLabel: 'Start Date',
      itemId: 'start_date_chooser',
      labelWidth: 75
    });

    this.add({
      xtype: 'datefield',
      fieldLabel: 'End Date',
      itemId:'end_date_chooser',
      labelWidth: 75
    });

    this.burnChart = this.add({
      xtype: 'rallychart',
      storeType: 'Rally.data.lookback.SnapshotStore',
      storeConfig: this._getStoreConfig(),
      calculatorType: 'Rally.example.BurnCalculator',
      calculatorConfig: { completedScheduleStateNames: ['Accepted', 'Released'] },
      chartConfig: this._getChartConfig()
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
        text: 'PI Burnup'
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

  _onUserStoryComboboxLoad: function() {
    console.log('_onUserStoryComboboxLoad');
  },

  _onUserStoryComboboxChanged: function(combo,records) {
    this.userStoryID = records[0].get('ObjectID');
    console.log('_onUserStoryComboboxChanged',this.userStoryID);
    this.burnChart.refresh();
  }

  //API Docs: https://help.rallydev.com/apps/2.1/doc/
});
