'use strict';

angular.module('propel-analytic-ui')
  .directive('stackedAreaGraph', function () {
    return {
      restrict: 'E',
      templateUrl: 'templates/propel-analytic-ui/graphs/stacked-area-graph.html',
      scope: {
        graphOptions: '=',
        commonOptions: '=',
        id: '@'
      },

      controller: 'stackedAreaGraphController',
      controllerAs: 'vm'
    };
  })
  .controller('stackedAreaGraphController', function ($scope, $stateParams, $location, $translate, currency2Filter, numberFilter, intervals, transformData, dateFormat, AnalyticApi, GRAPH_TYPES, GRAPH_STATES, globalError) {
    var vm = this;
    vm.intervalsList = {
      'week': [$translate.instant('analytic.home.interval.week'), 6],
      'month': [$translate.instant('analytic.home.interval.month'), 1],
      'three-month': [$translate.instant('analytic.home.interval.three-month'), 3],
      'six-month': [$translate.instant('analytic.home.interval.six-month'), 6],
      'year': [$translate.instant('analytic.home.interval.year'), 12]
    };

    vm.commonOptions = $scope.commonOptions;
    vm.graphOptions = $scope.graphOptions;

    vm.id = $scope.id;
    vm.types = GRAPH_TYPES;
    vm.states = GRAPH_STATES;
    vm.isSupportType = function () {
      if (vm.graphOptions.entityType === 'supports') {
        return true;
      }
    };

    function next() {
      var query = Object.extended(vm.commonOptions).merge(vm.graphOptions);
      query = Object.reject(query, 'graphType');
      Object.merge(query, intervals.select(query.interval));
      delete query.interval;
      if ($stateParams.mock) {
        query.mock = true;
      }
      query.mock = true;
      return AnalyticApi.list(query)
        .$promise
        .then(function (analyticsData) {
          vm.graphData = transformData.transform(analyticsData);
        })
        .catch(function () {
          globalError.show('analytics.notFound');
          return [];
        });
    }

    vm.setState = function (state) {
      vm.graphOptions.state = state;
      next();
    };

    vm.setType = function (type) {
      vm.graphOptions.type = type;
      next();
    };

    vm.tooltipContent = function (d) {

      if (d === null) {
        return '';
      }
      var date = new Date(d.value);
      var toDate;

      var fromDate = dateFormat.format(date);
      if ($location.search().interval === 'week') {
        toDate = date.addDays(vm.intervalsList[$location.search().interval][1]);
      } else {
        toDate = date.setMonth(date.getMonth() + vm.intervalsList[$location.search().interval][1]);
        toDate = new Date(toDate);
        toDate.setDate(toDate.getDate() - 1);
      }
      var maxToDate = $location.search().to;
      maxToDate = new Date(maxToDate);
      toDate = (toDate > maxToDate) ? maxToDate : toDate;
      toDate = dateFormat.format(toDate);

      var trow = '';
      for (var i = 0; i < d.series.length; i++) {
        var currencyValue = d.series[i].value;
        if (vm.graphOptions.type !== 'COUNT') {
          currencyValue = currency2Filter(d.series[i].value, vm.currency);
        }
        if (d.series[i].color) {
          var keyValue = '$' + d.series[i].value;
          if (vm.graphOptions.type === 'COUNT' && (vm.chart.style() !== 'expand' || vm.chart.style() !== 'stack_percent')) {
            keyValue = d.series[i].value;
          }
          if (vm.chart.style() === 'expand' || vm.chart.style() === 'stack_percent') {
            keyValue = numberFilter(d.series[i].value * 100, 2) + '%';
          }

          trow += '<tr class="highlight"><td class="legend-color-guide"><div style="background-color: ' + d.series[i].color + '"></div></td><td class="key">' + d.series[i].key + '</td><td class="value">' + currencyValue + '</td></tr>';
        }
      }

      var html = '<table style="width:90%;" border="0"><thead><tr><td colspan="3"><strong class="x-value"><h5>' + vm.intervalsList[$location.search().interval][0] + '</h5>' + fromDate + ' - ' + toDate + '</strong></td></tr></thead><tbody>' + trow + '</tbody></table>';

      return html;
    };

    vm.options = {
      chart: {
        type: 'stackedAreaChart',
        height: 450,
        color: ['turquoise', 'grey', 'silver'],
        controls: {
          margin: {
            'top': 5,
            'right': 0,
            'bottom': 5,
            'left': -75
          }
        },
        margin: {
          top: 20,
          right: 35,
          bottom: 30,
          left: 75
        },
        x: function (d) {
          vm.currency = d[2];
          return d[0];
        },
        y: function (d) {
          return d[1];
        },
        useVoronoi: false,
        clipEdge: true,
        duration: 100,
        useInteractiveGuideline: true,
        interactiveLayer: {
          tooltip: {
            contentGenerator: vm.tooltipContent,
            classes: 'customizeTooltip',
			duration:1,
			hideDelay:1,
			id:nvtooltip
          }
        },
        xAxis: {
          showMaxMin: true,
          tickFormat: function (d) {
            return dateFormat.format(new Date(d), 'MMM dd ');
          }
        },
        yAxis: {
          tickFormat: function (d) {
            var yAxisVal = d;
            if (vm.graphOptions.type !== 'COUNT') {
              yAxisVal = currency2Filter(yAxisVal, vm.currency);
            } else if (vm.graphOptions.type === 'COUNT') {
              yAxisVal = parseInt(yAxisVal);
            }
            return yAxisVal;
          }
        },
        zoom: {
          enabled: false,
          scaleExtent: [1, 10],
          useFixedDomain: false,
          useNiceScale: false,
          horizontalOff: false,
          verticalOff: true,
          unzoomEventType: 'dblclick.zoom'
        },
        callback: function (chart) {
          vm.chart = chart;
        }
      }
    };

    $scope.$watch('commonOptions', function (newValue) {
      vm.commonOptions = newValue;
      next();
    }, true);
  });
