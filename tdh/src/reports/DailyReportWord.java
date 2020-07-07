package reports;

import java.io.IOException;

/*
This file is part of SMAP.

SMAP is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

SMAP is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with SMAP.  If not, see <http://www.gnu.org/licenses/>.

 */

import java.sql.Connection;
import java.util.Locale;
import java.util.ResourceBundle;
import java.util.logging.Level;
import java.util.logging.Logger;

import javax.servlet.ServletOutputStream;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.core.Application;
import javax.ws.rs.core.Context;
import javax.ws.rs.core.Response;

import org.apache.poi.xddf.usermodel.PresetColor;
import org.apache.poi.xddf.usermodel.XDDFColor;
import org.apache.poi.xddf.usermodel.XDDFShapeProperties;
import org.apache.poi.xddf.usermodel.XDDFSolidFillProperties;
import org.apache.poi.xddf.usermodel.chart.AxisPosition;
import org.apache.poi.xddf.usermodel.chart.ChartTypes;
import org.apache.poi.xddf.usermodel.chart.XDDFBarChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFCategoryAxis;
import org.apache.poi.xddf.usermodel.chart.XDDFChartData;
import org.apache.poi.xddf.usermodel.chart.XDDFChartLegend;
import org.apache.poi.xddf.usermodel.chart.XDDFValueAxis;
import org.apache.poi.xwpf.usermodel.XWPFChart;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.usermodel.XWPFParagraph;
import org.apache.poi.xwpf.usermodel.XWPFRun;
import org.apache.poi.xwpf.usermodel.XWPFTable;
import org.apache.poi.xwpf.usermodel.XWPFTableRow;
import org.smap.sdal.Utilities.Authorise;
import org.smap.sdal.Utilities.GeneralUtilityMethods;
import org.smap.sdal.Utilities.SDDataSource;


@Path("/report/word")
public class DailyReportWord extends Application {

	Authorise a = new Authorise(null, Authorise.ORG);

	private static Logger log =
			Logger.getLogger(DailyReportWord.class.getName());


	@GET
	@Produces("application/vnd.openxmlformats-officedocument.wordprocessingml.document")
	public Response getMonthly (@Context HttpServletRequest request,
			@Context HttpServletResponse response) {

		String connectionString = "tdh - daily report";

		// Authorisation - Access
		Connection sd = SDDataSource.getConnection(connectionString);	
		a.isAuthorised(sd, request.getRemoteUser());		
		// End Authorisation 

		try {
			Locale locale = new Locale(GeneralUtilityMethods.getUserLanguage(sd, request, request.getRemoteUser()));
			ResourceBundle localisation = ResourceBundle.getBundle("org.smap.sdal.resources.SmapResources", locale);

			XWPFDocument doc = new XWPFDocument();
			XWPFParagraph p1 = doc.createParagraph();

			p1.setWordWrapped(true);
			p1.setSpacingAfterLines(1);

			XWPFRun r1 = p1.createRun();
			String t1 = "Sample Paragraph Post. is a sample Paragraph post. peru-duellmans-poison-dart-frog.";
			r1.setText(t1);
			r1.setText("");
			r1.setText("");

			//create table
			XWPFTable table = doc.createTable();
			table.setWidth("100.00%");

			//create first row
			XWPFTableRow tableRowOne = table.getRow(0);
			tableRowOne.getCell(0).setText("col one, row one");
			tableRowOne.addNewTableCell().setText("col two, row one");
			tableRowOne.addNewTableCell().setText("col three, row one");

			// chart
			XWPFChart chart = doc.createChart();
			
			XDDFChartLegend legend = chart.getOrAddLegend();

            // Use a category axis for the bottom axis.
            XDDFCategoryAxis bottomAxis = chart.createCategoryAxis(AxisPosition.BOTTOM);
            bottomAxis.setTitle("x"); // https://stackoverflow.com/questions/32010765
			XDDFValueAxis leftAxis = chart.createValueAxis(AxisPosition.LEFT);
            leftAxis.setTitle("f(x)");

            //XDDFDataSource<Double> xs = XDDFDataSourcesFactory..fromNumericCellRange(sheet, new CellRangeAddress(0, 0, 0, NUM_OF_COLUMNS - 1));
            //XDDFNumericalDataSource<Double> ys1 = XDDFDataSourcesFactory.fromNumericCellRange(sheet, new CellRangeAddress(1, 1, 0, NUM_OF_COLUMNS - 1));
            //XDDFNumericalDataSource<Double> ys2 = XDDFDataSourcesFactory.fromNumericCellRange(sheet, new CellRangeAddress(2, 2, 0, NUM_OF_COLUMNS - 1));

            XDDFChartData data = chart.createData(ChartTypes.BAR, bottomAxis, leftAxis);
            //XDDFChartData.Series series1 = data.addSeries(xs, ys1);
            //series1.setTitle("2x", null); // https://stackoverflow.com/questions/21855842
            //XDDFChartData.Series series2 = data.addSeries(xs, ys2);
            //series2.setTitle("3x", null);

            // in order to transform a bar chart into a column chart, you just need to change the bar direction
            XDDFBarChartData bar = (XDDFBarChartData) data;
            //bar.setBarDirection(BarDirection.COL);
            // looking for "Stacked Bar Chart"? uncomment the following line
            // bar.setBarGrouping(BarGrouping.STACKED);

            solidFillSeries(data, 0, PresetColor.TURQUOISE);
            solidFillSeries(data, 1, PresetColor.BLUE);

            
			chart.plot(data);
			// write to a docx file
			GeneralUtilityMethods.setFilenameInResponse("report.docx", response);
			ServletOutputStream fo = null;
			try {
				// create .docx file
				fo = response.getOutputStream();

				// write to the .docx file
				doc.write(fo);
			} catch (IOException e) {
			} finally {
				if (fo != null) {
					try {
						fo.close();
					} catch (IOException e) {
						e.printStackTrace();
					}
				}
				if (doc != null) {
					try {
						doc.close();
					} catch (IOException e) {
						e.printStackTrace();
					}
				}
			}

		}  catch (Exception e) {
			log.log(Level.SEVERE, "Exception", e);
		} finally {

			SDDataSource.closeConnection(connectionString, sd);	

		}
		return Response.ok("").build();
	}
	
	 private static void solidFillSeries(XDDFChartData data, int index, PresetColor color) {
	        XDDFSolidFillProperties fill = new XDDFSolidFillProperties(XDDFColor.from(color));
	        XDDFChartData.Series series = data.getSeries().get(index);
	        XDDFShapeProperties properties = series.getShapeProperties();
	        if (properties == null) {
	            properties = new XDDFShapeProperties();
	        }
	        //properties.setFillProperties(fill);
	        series.setShapeProperties(properties);
	    }


}
